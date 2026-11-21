import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Moon, Sun, Globe, AlertCircle, ArrowRight } from 'lucide-react';
import { useWebStore } from '../../store/useWebStore';
import { useTranslation } from '../../localization/useTranslation';
import { lightTokens, darkTokens } from '../../theme/theme';
import { api } from '../../services/api';
import { Language } from '../../localization/translations';

export const AuthScreen: React.FC = () => {
  const { theme, setTheme, setLanguage, setUser } = useWebStore();
  const { t, language } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await api.post(endpoint, {
        username: username.trim(),
        password,
        deviceName: 'Web Chrome Client',
        platform: 'web',
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setUser(user, accessToken, refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: tokens.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        transition: 'background-color 0.25s ease',
      }}
    >
      {/* Top Controls: Theme & Language */}
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: tokens.primaryAccent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Shield size={22} />
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 20,
              color: tokens.textPrimary,
              letterSpacing: '-0.02em',
            }}
          >
            {t('app_title')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Language Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: tokens.bgSecondary,
              border: `1px solid ${tokens.border}`,
              borderRadius: 8,
              padding: '4px 10px',
            }}
          >
            <Globe size={15} color={tokens.textMuted} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              style={{
                background: 'transparent',
                border: 'none',
                color: tokens.textPrimary,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="en">English</option>
              <option value="gu">ગુજરાતી</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: tokens.bgSecondary,
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: tokens.bgElevated,
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: `1px solid ${tokens.border}`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 24,
              fontWeight: 700,
              color: tokens.textPrimary,
            }}
          >
            {isRegister ? t('register') : t('login')}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: tokens.textSecondary,
              lineHeight: 1.45,
            }}
          >
            {isRegister ? t('sign_up_desc') : t('sign_in_desc')}
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: tokens.dangerBg,
              color: tokens.danger,
              fontSize: 13,
              marginBottom: 18,
              border: `1px solid ${tokens.danger}33`,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: tokens.textSecondary,
              }}
            >
              {t('username')}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex99"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${tokens.border}`,
                backgroundColor: tokens.bgSecondary,
                color: tokens.textPrimary,
                fontSize: 14,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: tokens.textSecondary,
              }}
            >
              {t('password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${tokens.border}`,
                backgroundColor: tokens.bgSecondary,
                color: tokens.textPrimary,
                fontSize: 14,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 10,
              backgroundColor: tokens.primaryAccent,
              color: '#ffffff',
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background-color 0.2s ease',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <span>{loading ? 'Processing...' : isRegister ? t('register') : t('login')}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.primaryAccent,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            {isRegister ? t('already_have_account') : t('dont_have_account')}
          </button>
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: `1px solid ${tokens.border}`,
            fontSize: 12,
            color: tokens.textMuted,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {t('device_policy_warning')}
        </div>
      </motion.div>

      {/* Footer */}
      <div
        style={{
          fontSize: 12,
          color: tokens.textMuted,
          textAlign: 'center',
        }}
      >
        {t('app_subtitle')} • Neon PostgreSQL + Signal Protocol E2EE
      </div>
    </div>
  );
};
