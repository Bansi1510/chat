export const PERMISSION_KEYS = [
  'chat.text',
  'chat.media',
  'chat.voice',
  'chat.reply',
  'chat.forward',
  'chat.react',
  'chat.edit',
  'chat.star',
  'chat.schedule',
  'chat.disappearing',
  'chat.translate',
  'chat.search',
  'location.live',
  'call.audio',
  'call.video',
  'backup.use',
  'qr.use',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const isPermissionKey = (key: string): key is PermissionKey =>
  (PERMISSION_KEYS as readonly string[]).includes(key);

export type PermissionMap = Record<PermissionKey, boolean>;
