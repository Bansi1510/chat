import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  role: string;
  avatarUrl?: string | null;
}

interface WebState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: User | null, access?: string, refresh?: string) => void;
  logout: () => void;
}

export const useWebStore = create<WebState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  setUser: (user, accessToken, refreshToken) => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    if (accessToken) localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken: accessToken || null, refreshToken: refreshToken || null });
  },
  logout: () => {
    localStorage.clear();
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
