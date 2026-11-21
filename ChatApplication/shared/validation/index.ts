import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots and dashes');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters');

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  deviceName: z.string().trim().max(60).optional(),
  platform: z.enum(['android', 'web']).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  deviceName: z.string().trim().max(60).optional(),
  platform: z.enum(['android', 'web']).optional(),
});
