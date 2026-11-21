import React, { useState } from 'react';
import { Moon, Sun, Lock, Cloud } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens, ThemeMode } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { Language } from '../../localization/translations';
import { api } from '../../services/api';

export const SettingsModal: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    theme,
    setTheme,
    language,
    setLanguage,
    user,
    setUser,
    blockedUsers,
    setBlockedUsers,
  } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [activeTab, setActiveTab] = useState<'appearance' | 'account' | 'privacy'>('appearance');
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.patch('/me/username', { username: newUsername.trim() });
      setUser(res.data.data, undefined, undefined);
      setMsg('Username updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update username');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.patch('/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMsg('Password updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update password');
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await api.delete(`/users/${userId}/block`);
      setBlockedUsers(blockedUsers.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'settings'}
      onClose={() => setActiveModal('none')}
      title={t('settings')}
      maxWidth={500}
    >
      <div>
        {msg && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: tokens.successBg,
              color: tokens.success,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {msg}
          </div>
        )}
        {error && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: tokens.dangerBg,
              color: tokens.danger,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${tokens.border}`, paddingBottom: 10, marginBottom: 18 }}>
          {[
            { id: 'appearance', label: 'Appearance & Language', icon: Sun },
            { id: 'account', label: 'Account & Security', icon: Lock },
            { id: 'privacy', label: 'Privacy & Backup', icon: Cloud },
          ].map((tab) => {
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isSel ? tokens.primaryAccent : 'transparent',
                  color: isSel ? '#ffffff' : tokens.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Appearance */}
        {activeTab === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {t('theme')}
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['light', 'dark'] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTheme(mode)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 10,
                      border: `2px solid ${theme === mode ? tokens.primaryAccent : tokens.border}`,
                      backgroundColor: tokens.bgTertiary,
                      color: tokens.textPrimary,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    <span>{mode === 'dark' ? t('dark') : t('light')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {t('language')}
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { code: 'en', label: 'English' },
                  { code: 'gu', label: 'ગુજરાતી' },
                  { code: 'hi', label: 'हिन्दी' },
                ].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code as Language)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 10,
                      border: `2px solid ${language === l.code ? tokens.primaryAccent : tokens.border}`,
                      backgroundColor: tokens.bgTertiary,
                      color: tokens.textPrimary,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Account */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <form onSubmit={handleChangeUsername}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Change Username
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${tokens.border}`,
                    backgroundColor: tokens.bgTertiary,
                    color: tokens.textPrimary,
                    fontSize: 13,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    backgroundColor: tokens.primaryAccent,
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </form>

            <form onSubmit={handleChangePassword}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Change Password
              </label>
              <input
                type="password"
                placeholder="Current Password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${tokens.border}`,
                  backgroundColor: tokens.bgTertiary,
                  color: tokens.textPrimary,
                  fontSize: 13,
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="password"
                placeholder="New Password (min 8 chars)"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${tokens.border}`,
                  backgroundColor: tokens.bgTertiary,
                  color: tokens.textPrimary,
                  fontSize: 13,
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: tokens.primaryAccent,
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Update Password
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Privacy & Backup */}
        {activeTab === 'privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cloud Backup CTA */}
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: tokens.bgTertiary,
                border: `1px solid ${tokens.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: tokens.textPrimary }}>
                  {t('backup')}
                </div>
                <div style={{ fontSize: 12, color: tokens.textMuted }}>
                  End-to-end encrypted backup of chats & metadata.
                </div>
              </div>
              <button
                onClick={() => setActiveModal('backup')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: tokens.primaryAccent,
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Manage
              </button>
            </div>

            {/* Blocked Users */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: tokens.textPrimary }}>
                Blocked Users ({blockedUsers.length})
              </div>
              {blockedUsers.length === 0 ? (
                <div style={{ fontSize: 13, color: tokens.textMuted }}>No blocked users.</div>
              ) : (
                blockedUsers.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: tokens.bgTertiary,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>@{b.username}</span>
                    <button
                      onClick={() => handleUnblock(b.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: tokens.primaryAccent,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
