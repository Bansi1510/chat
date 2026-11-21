import { prisma } from '../../config/prisma';
import { PERMISSION_KEYS, PermissionKey } from './permissionKeys';

/** Default when neither a user override nor a global rule exists. */
const DEFAULT_ENABLED = true;

export type PermissionMap = Record<PermissionKey, boolean>;

export async function getEffectivePermissions(userId: string, role: string): Promise<PermissionMap> {
  const result = {} as PermissionMap;
  if (role === 'superadmin') {
    PERMISSION_KEYS.forEach((k) => (result[k] = true));
    return result;
  }
  const [globals, overrides] = await Promise.all([
    prisma.globalPermission.findMany(),
    prisma.userPermission.findMany({ where: { userId } }),
  ]);
  const g = new Map(globals.map((x) => [x.key, x.isEnabled]));
  const o = new Map(overrides.map((x) => [x.permissionKey, x.isGranted]));
  PERMISSION_KEYS.forEach((k) => {
    result[k] = o.get(k) ?? g.get(k) ?? DEFAULT_ENABLED;
  });
  return result;
}

export async function isAllowed(userId: string, role: string, key: PermissionKey): Promise<boolean> {
  return (await getEffectivePermissions(userId, role))[key];
}

export async function setGlobalPermission(key: PermissionKey, isEnabled: boolean) {
  return prisma.globalPermission.upsert({
    where: { key },
    update: { isEnabled },
    create: { key, isEnabled },
  });
}

export async function setUserPermission(userId: string, permissionKey: PermissionKey, isGranted: boolean) {
  return prisma.userPermission.upsert({
    where: { userId_permissionKey: { userId, permissionKey } },
    update: { isGranted },
    create: { userId, permissionKey, isGranted },
  });
}

/** Removes a per-user override so the global/default rule applies again. */
export async function clearUserPermission(userId: string, permissionKey: PermissionKey) {
  return prisma.userPermission.deleteMany({
    where: { userId, permissionKey },
  });
}

export async function getGlobalPermissions(): Promise<PermissionMap> {
  const globals = await prisma.globalPermission.findMany();
  const g = new Map(globals.map((x) => [x.key, x.isEnabled]));
  const result = {} as PermissionMap;
  PERMISSION_KEYS.forEach((k) => (result[k] = g.get(k) ?? DEFAULT_ENABLED));
  return result;
}
