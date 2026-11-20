import { Types } from 'mongoose';
import { GlobalPermission, UserPermission } from '../../models/Permission';
import { PERMISSION_KEYS, PermissionKey } from './permissionKeys';

/** Default when neither a user override nor a global rule exists. */
const DEFAULT_ENABLED = true;

export type PermissionMap = Record<PermissionKey, boolean>;

export async function getEffectivePermissions(userId: string | Types.ObjectId, role: string): Promise<PermissionMap> {
  const result = {} as PermissionMap;
  if (role === 'superadmin') {
    PERMISSION_KEYS.forEach((k) => (result[k] = true));
    return result;
  }
  const [globals, overrides] = await Promise.all([
    GlobalPermission.find().lean(),
    UserPermission.find({ userId }).lean(),
  ]);
  const g = new Map(globals.map((x) => [x.key, x.enabled]));
  const o = new Map(overrides.map((x) => [x.key, x.enabled]));
  PERMISSION_KEYS.forEach((k) => {
    result[k] = o.get(k) ?? g.get(k) ?? DEFAULT_ENABLED;
  });
  return result;
}

export async function isAllowed(userId: string | Types.ObjectId, role: string, key: PermissionKey) {
  return (await getEffectivePermissions(userId, role))[key];
}

export const setGlobalPermission = (key: PermissionKey, enabled: boolean) =>
  GlobalPermission.updateOne({ key }, { $set: { enabled } }, { upsert: true });

export const setUserPermission = (userId: string, key: PermissionKey, enabled: boolean) =>
  UserPermission.updateOne({ userId, key }, { $set: { enabled } }, { upsert: true });

/** Removes a per-user override so the global/default rule applies again. */
export const clearUserPermission = (userId: string, key: PermissionKey) =>
  UserPermission.deleteOne({ userId, key });

export async function getGlobalPermissions(): Promise<PermissionMap> {
  const globals = await GlobalPermission.find().lean();
  const g = new Map(globals.map((x) => [x.key, x.enabled]));
  const result = {} as PermissionMap;
  PERMISSION_KEYS.forEach((k) => (result[k] = g.get(k) ?? DEFAULT_ENABLED));
  return result;
}
