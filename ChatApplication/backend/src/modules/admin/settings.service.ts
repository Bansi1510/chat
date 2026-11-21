import { prisma } from '../../config/prisma';

export interface AppSettingsPayload {
  qrExpirySeconds?: number;
  maxFileSizeMb?: number;
  maxLoginAttempts?: number;
  loginLockMinutes?: number;
  backupFrequencyDays?: number;
  [key: string]: unknown;
}

const DEFAULT_SETTINGS: AppSettingsPayload = {
  qrExpirySeconds: 86400,
  maxFileSizeMb: 25,
  maxLoginAttempts: 5,
  loginLockMinutes: 15,
  backupFrequencyDays: 7,
};

export async function getSettings(): Promise<AppSettingsPayload> {
  const row = await prisma.applicationSetting.findUnique({
    where: { key: 'app' },
  });
  if (!row) {
    const created = await prisma.applicationSetting.create({
      data: {
        key: 'app',
        value: DEFAULT_SETTINGS as any,
        description: 'System configuration settings',
      },
    });
    return created.value as AppSettingsPayload;
  }
  return { ...DEFAULT_SETTINGS, ...(row.value as Record<string, unknown>) };
}

export async function updateSettings(patch: Record<string, unknown>): Promise<AppSettingsPayload> {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  const updated = await prisma.applicationSetting.upsert({
    where: { key: 'app' },
    update: { value: merged as any },
    create: { key: 'app', value: merged as any, description: 'System configuration settings' },
  });
  return updated.value as AppSettingsPayload;
}
