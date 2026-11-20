import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { errorHandler } from '../src/middleware/errorHandling';
import { requireAuth, requirePermission } from '../src/middleware/auth';
import { User } from '../src/models/User';
import { Session } from '../src/models/Session';
import { hashPassword } from '../src/security/password';

const app = createApp();
const api = '/api/v1';
const PASS = 'Password123!';

// A feature route guarded by RBAC, used to verify server-side enforcement.
const featureApp = express();
featureApp.get('/video', requireAuth, requirePermission('call.video'), (_q, r) => {
  r.json({ ok: true });
});
featureApp.use(errorHandler);

const reg = (username: string, password = PASS) =>
  request(app).post(`${api}/auth/register`).send({ username, password });
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function makeAdmin() {
  await User.create({
    username: 'root',
    usernameKey: 'root',
    passwordHash: await hashPassword('AdminPass123!'),
    role: 'superadmin',
  });
  const res = await request(app).post(`${api}/auth/login`).send({ username: 'root', password: 'AdminPass123!' });
  return res.body.data.accessToken as string;
}

beforeAll(async () => {
  await connectDatabase();
});
beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await User.syncIndexes();
  await Session.syncIndexes();
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

describe('registration', () => {
  it('registers a valid user', async () => {
    const res = await reg('alice');
    expect(res.status).toBe(201);
    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.user.role).toBe('user');
    expect(res.body.data.accessToken).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
  it('stores an argon2id hash, not the password', async () => {
    await reg('alice');
    const u = await User.findOne({ usernameKey: 'alice' });
    expect(u!.passwordHash).toMatch(/^\$argon2id\$/);
  });
  it('rejects duplicate usernames, case-insensitively', async () => {
    await reg('alice');
    const res = await reg('ALICE');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });
  it('allows only one account under concurrent duplicate registration', async () => {
    const results = await Promise.all([reg('racer'), reg('racer'), reg('racer')]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await User.countDocuments({ usernameKey: 'racer' })).toBe(1);
  });
  it.each([
    ['short username', 'ab', PASS],
    ['bad characters', 'bad name!', PASS],
    ['short password', 'validname', 'short'],
    ['empty username', '', PASS],
  ])('rejects %s', async (_n, u, p) => {
    const res = await reg(u, p);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('rejects malformed JSON', async () => {
    const res = await request(app).post(`${api}/auth/register`).set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
  it('cannot create a superadmin through registration', async () => {
    const res = await request(app).post(`${api}/auth/register`).send({ username: 'evil', password: PASS, role: 'superadmin' });
    expect(res.body.data.user.role).toBe('user');
  });
});

describe('login and sessions', () => {
  it('logs in with correct credentials', async () => {
    await reg('alice');
    const res = await request(app).post(`${api}/auth/login`).send({ username: 'Alice', password: PASS });
    expect(res.status).toBe(200);
  });
  it('rejects wrong password and unknown user with the same error', async () => {
    await reg('alice');
    const a = await request(app).post(`${api}/auth/login`).send({ username: 'alice', password: 'wrongpass1' });
    const b = await request(app).post(`${api}/auth/login`).send({ username: 'ghost', password: 'wrongpass1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toEqual(b.body.error);
  });
  it('locks the account after repeated failures', async () => {
    await reg('alice');
    for (let i = 0; i < 5; i++) {
      await request(app).post(`${api}/auth/login`).send({ username: 'alice', password: 'wrongpass1' });
    }
    const res = await request(app).post(`${api}/auth/login`).send({ username: 'alice', password: PASS });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });
  it('enforces one device per account', async () => {
    const first = (await reg('alice')).body.data;
    const second = await request(app).post(`${api}/auth/login`).send({ username: 'alice', password: PASS });
    expect(second.status).toBe(200);
    const old = await request(app).get(`${api}/me`).set(auth(first.accessToken));
    expect(old.status).toBe(401);
    expect(old.body.error.code).toBe('SESSION_REVOKED');
    const oldRefresh = await request(app).post(`${api}/auth/refresh`).send({ refreshToken: first.refreshToken });
    expect(oldRefresh.status).toBe(401);
    const fresh = await request(app).get(`${api}/me`).set(auth(second.body.data.accessToken));
    expect(fresh.status).toBe(200);
  });
  it('rotates refresh tokens', async () => {
    const { refreshToken } = (await reg('alice')).body.data;
    const r1 = await request(app).post(`${api}/auth/refresh`).send({ refreshToken });
    expect(r1.status).toBe(200);
    const reuse = await request(app).post(`${api}/auth/refresh`).send({ refreshToken });
    expect(reuse.status).toBe(401);
    const me = await request(app).get(`${api}/me`).set(auth(r1.body.data.accessToken));
    expect(me.status).toBe(200);
  });
  it('logout revokes the session', async () => {
    const { accessToken } = (await reg('alice')).body.data;
    await request(app).post(`${api}/auth/logout`).set(auth(accessToken));
    expect((await request(app).get(`${api}/me`).set(auth(accessToken))).status).toBe(401);
  });
  it('rejects missing, malformed and tampered tokens', async () => {
    const { accessToken } = (await reg('alice')).body.data;
    expect((await request(app).get(`${api}/me`)).status).toBe(401);
    expect((await request(app).get(`${api}/me`).set('Authorization', 'Bearer junk')).status).toBe(401);
    expect((await request(app).get(`${api}/me`).set(auth(accessToken + 'x'))).status).toBe(401);
  });
});

describe('profile', () => {
  it('changes username and blocks taken names', async () => {
    const { accessToken } = (await reg('alice')).body.data;
    await reg('bob');
    const taken = await request(app).patch(`${api}/me/username`).set(auth(accessToken)).send({ username: 'BOB' });
    expect(taken.status).toBe(409);
    const ok = await request(app).patch(`${api}/me/username`).set(auth(accessToken)).send({ username: 'alice2' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.username).toBe('alice2');
    const login = await request(app).post(`${api}/auth/login`).send({ username: 'alice2', password: PASS });
    expect(login.status).toBe(200);
  });
  it('changes password only with the correct current password', async () => {
    const { accessToken } = (await reg('alice')).body.data;
    const bad = await request(app).patch(`${api}/me/password`).set(auth(accessToken)).send({ currentPassword: 'nope12345', newPassword: 'NewPassword456!' });
    expect(bad.status).toBe(401);
    const good = await request(app).patch(`${api}/me/password`).set(auth(accessToken)).send({ currentPassword: PASS, newPassword: 'NewPassword456!' });
    expect(good.status).toBe(200);
    expect((await request(app).post(`${api}/auth/login`).send({ username: 'alice', password: PASS })).status).toBe(401);
    expect((await request(app).post(`${api}/auth/login`).send({ username: 'alice', password: 'NewPassword456!' })).status).toBe(200);
  });
});

describe('RBAC', () => {
  it('blocks normal users from all admin endpoints', async () => {
    const { accessToken } = (await reg('alice')).body.data;
    for (const [m, p] of [
      ['get', '/admin/users'],
      ['get', '/admin/settings'],
      ['get', '/admin/permissions'],
      ['get', '/admin/audit-logs'],
    ] as const) {
      const res = await request(app)[m](`${api}${p}`).set(auth(accessToken));
      expect(res.status).toBe(403);
    }
    expect((await request(app).get(`${api}/admin/users`)).status).toBe(401);
  });

  it('applies global then per-user permission precedence dynamically', async () => {
    const admin = await makeAdmin();
    const alice = (await reg('alice')).body.data;
    const aliceId = alice.user.id;
    const hit = () => request(featureApp).get('/video').set(auth(alice.accessToken));

    expect((await hit()).status).toBe(200);

    await request(app).put(`${api}/admin/permissions/call.video`).set(auth(admin)).send({ enabled: false });
    const denied = await hit();
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('PERMISSION_DENIED');

    await request(app).put(`${api}/admin/users/${aliceId}/permissions/call.video`).set(auth(admin)).send({ enabled: true });
    expect((await hit()).status).toBe(200);

    await request(app).delete(`${api}/admin/users/${aliceId}/permissions/call.video`).set(auth(admin));
    expect((await hit()).status).toBe(403);

    const mine = await request(app).get(`${api}/me/permissions`).set(auth(alice.accessToken));
    expect(mine.body.data['call.video']).toBe(false);
    expect(mine.body.data['chat.text']).toBe(true);
  });

  it('rejects unknown permission keys and bad bodies', async () => {
    const admin = await makeAdmin();
    expect((await request(app).put(`${api}/admin/permissions/not.real`).set(auth(admin)).send({ enabled: true })).status).toBe(400);
    expect((await request(app).put(`${api}/admin/permissions/call.video`).set(auth(admin)).send({ enabled: 'yes' })).status).toBe(400);
  });
});

describe('admin', () => {
  it('lists users with pagination and search', async () => {
    const admin = await makeAdmin();
    await reg('anna');
    await reg('andy');
    await reg('zed');
    const all = await request(app).get(`${api}/admin/users?limit=2&page=1`).set(auth(admin));
    expect(all.body.data.items).toHaveLength(2);
    expect(all.body.data.total).toBe(4);
    const q = await request(app).get(`${api}/admin/users?q=an`).set(auth(admin));
    expect(q.body.data.items.map((u: { username: string }) => u.username).sort()).toEqual(['andy', 'anna']);
    expect((await request(app).get(`${api}/admin/users?limit=1000`).set(auth(admin))).status).toBe(400);
  });

  it('deletes accounts, revokes sessions, frees username and audits it', async () => {
    const admin = await makeAdmin();
    const alice = (await reg('alice')).body.data;
    const del = await request(app).delete(`${api}/admin/users/${alice.user.id}`).set(auth(admin));
    expect(del.status).toBe(200);
    expect((await request(app).get(`${api}/me`).set(auth(alice.accessToken))).status).toBe(401);
    expect((await request(app).post(`${api}/auth/login`).send({ username: 'alice', password: PASS })).status).toBe(401);
    expect((await reg('alice')).status).toBe(201);
    const logs = await request(app).get(`${api}/admin/audit-logs?action=user.delete`).set(auth(admin));
    expect(logs.body.data.total).toBe(1);
  });

  it('cannot delete the super admin or unknown users', async () => {
    const admin = await makeAdmin();
    const root = await User.findOne({ role: 'superadmin' });
    expect((await request(app).delete(`${api}/admin/users/${root!._id}`).set(auth(admin))).status).toBe(403);
    expect((await request(app).delete(`${api}/admin/users/${new mongoose.Types.ObjectId()}`).set(auth(admin))).status).toBe(404);
    expect((await request(app).delete(`${api}/admin/users/not-an-id`).set(auth(admin))).status).toBe(400);
  });

  it('updates settings with validation and audit', async () => {
    const admin = await makeAdmin();
    const def = await request(app).get(`${api}/admin/settings`).set(auth(admin));
    expect(def.body.data.qrExpirySeconds).toBe(86400);
    const upd = await request(app).patch(`${api}/admin/settings`).set(auth(admin)).send({ qrExpirySeconds: 600, maxFileSizeMb: { video: 100 } });
    expect(upd.status).toBe(200);
    expect(upd.body.data.qrExpirySeconds).toBe(600);
    expect(upd.body.data.maxFileSizeMb.video).toBe(100);
    expect(upd.body.data.maxFileSizeMb.image).toBe(10);
    expect((await request(app).patch(`${api}/admin/settings`).set(auth(admin)).send({ qrExpirySeconds: 5 })).status).toBe(400);
    expect((await request(app).patch(`${api}/admin/settings`).set(auth(admin)).send({ unknownField: 1 })).status).toBe(400);
    const logs = await request(app).get(`${api}/admin/audit-logs?action=settings.update`).set(auth(admin));
    expect(logs.body.data.total).toBe(1);
  });
});

describe('platform', () => {
  it('serves health and 404s unknown routes in the standard envelope', async () => {
    expect((await request(app).get('/health')).body.data.status).toBe('ok');
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
