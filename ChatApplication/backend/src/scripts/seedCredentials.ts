import { prisma } from '../config/prisma';
import { hashPassword } from '../security/password';

async function seed() {
  console.log('Seeding credentials into Neon PostgreSQL...');

  const passHash = await hashPassword('Password123!');
  const adminPassHash = await hashPassword('AdminPassword123!');

  // 1. Super Admin
  const root = await prisma.user.upsert({
    where: { usernameClean: 'root' },
    update: {
      passwordHash: adminPassHash,
      role: 'superadmin',
      status: 'active',
    },
    create: {
      username: 'root',
      usernameClean: 'root',
      passwordHash: adminPassHash,
      role: 'superadmin',
      status: 'active',
    },
  });

  // 2. User 1: Alice
  const alice = await prisma.user.upsert({
    where: { usernameClean: 'alice' },
    update: {
      passwordHash: passHash,
      role: 'user',
      status: 'active',
    },
    create: {
      username: 'alice',
      usernameClean: 'alice',
      passwordHash: passHash,
      role: 'user',
      status: 'active',
    },
  });

  // 3. User 2: Bob
  const bob = await prisma.user.upsert({
    where: { usernameClean: 'bob' },
    update: {
      passwordHash: passHash,
      role: 'user',
      status: 'active',
    },
    create: {
      username: 'bob',
      usernameClean: 'bob',
      passwordHash: passHash,
      role: 'user',
      status: 'active',
    },
  });

  // 4. Pair Alice and Bob into an active Conversation so they can chat immediately
  const pairKey = [alice.id, bob.id].sort().join('_');
  let convo = await prisma.conversation.findUnique({
    where: { pairKey },
  });

  if (!convo) {
    convo = await prisma.conversation.create({
      data: {
        pairKey,
        participants: {
          create: [{ userId: alice.id }, { userId: bob.id }],
        },
      },
    });
    console.log(`Created mutual chat between @alice and @bob: ID ${convo.id}`);
  }

  console.log('\n--- CREDENTIALS READY ---');
  console.log(`SUPER ADMIN : root   / AdminPassword123!`);
  console.log(`USER 1      : alice  / Password123!`);
  console.log(`USER 2      : bob    / Password123!`);
  console.log('-------------------------\n');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
