export type Role = 'user' | 'superadmin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type PlatformType = 'android' | 'web';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location';
export type CallType = 'audio' | 'video';
export type CallStatus = 'completed' | 'missed' | 'rejected' | 'busy' | 'failed';

export interface UserProfile {
  id: string;
  username: string;
  role: Role;
  avatarUrl: string | null;
  lastSeenAt?: string | null;
}

export interface ConversationSummary {
  id: string;
  peer: UserProfile | null;
  disappearingSeconds: number;
  pinned: boolean;
  muted: boolean;
  wallpaperUrl: string | null;
  lastMessage: {
    id: string;
    senderId: string;
    ciphertext: string;
    type: MessageType;
    createdAt: string;
    delivered: boolean;
    read: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  clientMsgId: string;
  ciphertext: string;
  type: MessageType;
  attachments?: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
    fileSizeBytes: number;
    fileName: string;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
  }>;
  replyToId?: string | null;
  forwarded?: boolean;
  edited?: boolean;
  reactions?: Array<{ userId: string; emoji: string }>;
  starred?: boolean;
  delivered: boolean;
  read: boolean;
  deletedForEveryone?: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export interface QRTokenPayload {
  rawToken: string;
  expiresAt: string;
}
