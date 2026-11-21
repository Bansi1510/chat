export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primaryAccent: string;
  primaryHover: string;
  secondaryAccent: string;
  bubbleMe: string;
  bubblePeer: string;
  bubbleMeText: string;
  bubblePeerText: string;
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  readTick: string;
}

export const lightTokens: ThemeTokens = {
  bgPrimary: '#f8fafc',
  bgSecondary: '#ffffff',
  bgTertiary: '#f1f5f9',
  bgElevated: '#ffffff',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primaryAccent: '#4f46e5',
  primaryHover: '#4338ca',
  secondaryAccent: '#06b6d4',
  bubbleMe: '#e0e7ff',
  bubblePeer: '#ffffff',
  bubbleMeText: '#1e1b4b',
  bubblePeerText: '#0f172a',
  danger: '#ef4444',
  dangerBg: '#fef2f2',
  success: '#10b981',
  successBg: '#ecfdf5',
  readTick: '#3b82f6',
};

export const darkTokens: ThemeTokens = {
  bgPrimary: '#0b0f17',
  bgSecondary: '#111827',
  bgTertiary: '#1f2937',
  bgElevated: '#1e293b',
  border: '#374151',
  borderSubtle: '#1f2937',
  textPrimary: '#f9fafb',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  primaryAccent: '#6366f1',
  primaryHover: '#4f46e5',
  secondaryAccent: '#22d3ee',
  bubbleMe: '#312e81',
  bubblePeer: '#1f2937',
  bubbleMeText: '#e0e7ff',
  bubblePeerText: '#f3f4f6',
  danger: '#f87171',
  dangerBg: '#450a0a',
  success: '#34d399',
  successBg: '#064e3b',
  readTick: '#60a5fa',
};
