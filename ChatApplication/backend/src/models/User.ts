import { InferSchemaType, Schema, model } from 'mongoose';

export const ROLES = ['user', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },
    /** Lower-cased username used for the unique index. Freed (rewritten) when the account is deleted. */
    usernameKey: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
    avatarUrl: { type: String, default: null },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: import('mongoose').Types.ObjectId };
export const User = model('User', userSchema);
