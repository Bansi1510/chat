import { create } from 'zustand';
import { Language } from '../localization/translations';
import { ThemeMode } from '../theme/theme';

export interface User {
  id: string;
  username: string;
  role: string;
  avatarUrl?: string | null;
}

export interface Conversation {
  id: string;
  peer: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    lastSeenAt?: string | null;
  } | null;
  disappearingSeconds: number;
  pinned: boolean;
  muted: boolean;
  wallpaperUrl?: string | null;
  lastMessage?: {
    id?: string;
    senderId?: string;
    ciphertext: string;
    type?: string;
    createdAt?: string;
    delivered?: boolean;
    read?: boolean;
  } | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  clientMsgId: string;
  ciphertext: string;
  type: string;
  attachments?: Array<{
    id?: string;
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

export interface ActiveCall {
  callId?: string;
  peerId: string;
  peerUsername: string;
  peerAvatar?: string | null;
  callType: 'audio' | 'video';
  state: 'incoming' | 'outgoing' | 'connected' | 'ended';
  isMuted: boolean;
  isVideoEnabled: boolean;
  durationSeconds: number;
}

interface WebState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  theme: ThemeMode;
  language: Language;
  conversations: Conversation[];
  activeConvo: Conversation | null;
  messages: Message[];
  activeCall: ActiveCall | null;
  permissions: Record<string, boolean>;
  blockedUsers: Array<{ id: string; username: string }>;
  isDetailsDrawerOpen: boolean;
  activeModal: 'none' | 'my_qr' | 'scan_qr' | 'admin' | 'settings' | 'backup' | 'starred' | 'scheduled';

  setUser: (user: User | null, access?: string, refresh?: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  setConversations: (convos: Conversation[] | ((prev: Conversation[]) => Conversation[])) => void;
  setActiveConvo: (convo: Conversation | null) => void;
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  setActiveCall: (call: ActiveCall | null | ((prev: ActiveCall | null) => ActiveCall | null)) => void;
  setPermissions: (perms: Record<string, boolean>) => void;
  setBlockedUsers: (users: Array<{ id: string; username: string }>) => void;
  setDetailsDrawerOpen: (open: boolean) => void;
  setActiveModal: (modal: WebState['activeModal']) => void;
  logout: () => void;
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getStoredItem(key: string, fallback: string | null = null): string | null {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined' || val === 'null') return fallback;
    return val;
  } catch {
    return fallback;
  }
}

export const useWebStore = create<WebState>((set) => ({
  user: getStoredUser(),
  accessToken: getStoredItem('token'),
  refreshToken: getStoredItem('refreshToken'),
  theme: (getStoredItem('theme', 'dark') as ThemeMode) || 'dark',
  language: (getStoredItem('language', 'en') as Language) || 'en',
  conversations: [],
  activeConvo: null,
  messages: [],
  activeCall: null,
  permissions: {},
  blockedUsers: [],
  isDetailsDrawerOpen: false,
  activeModal: 'none',

  setUser: (user, accessToken, refreshToken) => {
    try {
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');
      if (accessToken) localStorage.setItem('token', accessToken);
      else localStorage.removeItem('token');
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      else localStorage.removeItem('refreshToken');
    } catch {}
    set({ user: user || null, accessToken: accessToken || null, refreshToken: refreshToken || null });
  },
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  setLanguage: (language) => {
    localStorage.setItem('language', language);
    set({ language });
  },
  setConversations: (convos) =>
    set((state) => ({
      conversations: typeof convos === 'function' ? convos(state.conversations) : convos,
    })),
  setActiveConvo: (activeConvo) => set({ activeConvo }),
  setMessages: (msgs) =>
    set((state) => ({
      messages: typeof msgs === 'function' ? msgs(state.messages) : msgs,
    })),
  setActiveCall: (call) =>
    set((state) => ({
      activeCall: typeof call === 'function' ? call(state.activeCall) : call,
    })),
  setPermissions: (permissions) => set({ permissions }),
  setBlockedUsers: (blockedUsers) => set({ blockedUsers }),
  setDetailsDrawerOpen: (isDetailsDrawerOpen) => set({ isDetailsDrawerOpen }),
  setActiveModal: (activeModal) => set({ activeModal }),
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      conversations: [],
      activeConvo: null,
      messages: [],
      activeCall: null,
      activeModal: 'none',
      isDetailsDrawerOpen: false,
    });
  },
}));
