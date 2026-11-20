import { create } from 'zustand';
import { lightTheme, darkTheme, ThemeColors } from '../theme/colors';
import { Language, translations } from '../localization/i18n';

interface User {
  id: string;
  username: string;
  role: string;
  avatarUrl?: string | null;
}

interface AppState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isDark: boolean;
  theme: ThemeColors;
  language: Language;
  t: typeof translations.en;
  permissions: Record<string, boolean>;
  setUser: (user: User | null, access?: string, refresh?: string) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  setPermissions: (perms: Record<string, boolean>) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isDark: false,
  theme: lightTheme,
  language: 'en',
  t: translations.en,
  permissions: {},
  setUser: (user, accessToken, refreshToken) =>
    set((state) => ({
      user,
      accessToken: accessToken || state.accessToken,
      refreshToken: refreshToken || state.refreshToken,
    })),
  toggleTheme: () =>
    set((state) => ({
      isDark: !state.isDark,
      theme: !state.isDark ? darkTheme : lightTheme,
    })),
  setLanguage: (language: Language) =>
    set(() => ({
      language,
      t: translations[language],
    })),
  setPermissions: (permissions) => set({ permissions }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
    }),
}));
