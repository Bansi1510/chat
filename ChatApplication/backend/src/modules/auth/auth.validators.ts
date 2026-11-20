import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[A-Za-z0-9_.]+$/, 'Only letters, digits, underscore and dot are allowed');

export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  deviceName: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(30),
  password: z.string().min(1).max(128),
  deviceName: z.string().trim().max(80).optional(),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });

export const changeUsernameSchema = z.object({ username: usernameSchema });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
