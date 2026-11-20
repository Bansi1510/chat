import { Schema, model } from 'mongoose';

/** Single-document application configuration controlled by the Super Admin. */
const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'app' },
    qrExpirySeconds: { type: Number, default: 24 * 3600, min: 60 },
    maxFileSizeMb: {
      image: { type: Number, default: 10, min: 1 },
      video: { type: Number, default: 50, min: 1 },
      document: { type: Number, default: 20, min: 1 },
      audio: { type: Number, default: 20, min: 1 },
    },
    backupIntervalHours: { type: Number, default: 24, min: 1 },
    unreadReminderMinutes: { type: Number, default: 30, min: 1 },
    maxLoginAttempts: { type: Number, default: 5, min: 3 },
    loginLockMinutes: { type: Number, default: 15, min: 1 },
  },
  { timestamps: true },
);

export const AppSetting = model('AppSetting', appSettingSchema);
