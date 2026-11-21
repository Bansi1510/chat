export const DISAPPEARING_DURATIONS = [
  { label: 'Off', seconds: 0 },
  { label: '5 minutes', seconds: 300 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '1 week', seconds: 604800 },
  { label: '1 month', seconds: 2592000 },
  { label: '1 year', seconds: 31536000 },
] as const;

export const LIVE_LOCATION_DURATIONS = [
  { label: '15 minutes', seconds: 900 },
  { label: '1 hour', seconds: 3600 },
  { label: '8 hours', seconds: 28800 },
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
] as const;

export const THEME_MODES = ['light', 'dark', 'system'] as const;
