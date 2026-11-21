import React, { useState, useEffect } from 'react';
import { Users, Shield, Sliders, FileText, Trash2, Search } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { api } from '../../services/api';
import { PERMISSION_KEYS, PermissionKey } from '../../../../shared/permissions';

export const AdminDashboardModal: React.FC = () => {
  const { activeModal, setActiveModal, theme } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'settings' | 'audit'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadUsers = async () => {
    try {
      const res = await api.get(`/admin/users?q=${searchQuery}`);
      const list = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.get('/admin/permissions');
      const data = res.data?.data || res.data || {};
      setPermissions(typeof data === 'object' && !Array.isArray(data) ? data : {});
    } catch (err) {
      console.error(err);
      setPermissions({});
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setSettings(res.data?.data || res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const loadAudit = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      const list = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
      setAuditLogs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    if (activeModal === 'admin') {
      loadUsers();
      loadPermissions();
      loadSettings();
      loadAudit();
    }
  }, [activeModal, searchQuery]);

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user @${username}? This action is irreversible.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      loadUsers();
      loadAudit();
      setMsg(`User @${username} was deleted.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  const handleTogglePermission = async (key: PermissionKey) => {
    const nextVal = !permissions[key];
    try {
      await api.put(`/admin/permissions/${key}`, { enabled: nextVal });
      setPermissions((prev) => ({ ...prev, [key]: nextVal }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/admin/settings', settings);
      setMsg('Settings updated successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'admin'}
      onClose={() => setActiveModal('none')}
      title={t('admin_dashboard')}
      maxWidth={720}
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

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderBottom: `1px solid ${tokens.border}`,
            paddingBottom: 10,
            marginBottom: 18,
          }}
        >
          {[
            { id: 'users', label: t('user_management'), icon: Users },
            { id: 'permissions', label: t('permissions'), icon: Shield },
            { id: 'settings', label: t('system_settings'), icon: Sliders },
            { id: 'audit', label: t('audit_logs'), icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: isSel ? tokens.primaryAccent : 'transparent',
                  color: isSel ? '#ffffff' : tokens.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Users */}
        {activeTab === 'users' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: tokens.bgTertiary,
                borderRadius: 8,
                padding: '6px 12px',
                marginBottom: 14,
                border: `1px solid ${tokens.border}`,
              }}
            >
              <Search size={16} color={tokens.textMuted} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: tokens.textPrimary,
                  fontSize: 13,
                  width: '100%',
                }}
              />
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.border}`, textAlign: 'left', color: tokens.textMuted }}>
                    <th style={{ padding: '8px' }}>Username</th>
                    <th style={{ padding: '8px' }}>Role</th>
                    <th style={{ padding: '8px' }}>Created</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${tokens.borderSubtle}` }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>@{u.username}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            backgroundColor: u.role === 'superadmin' ? '#f59e0b22' : tokens.bgTertiary,
                            color: u.role === 'superadmin' ? '#f59e0b' : tokens.textSecondary,
                            fontWeight: 600,
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', color: tokens.textMuted }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {u.role !== 'superadmin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: tokens.danger,
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Permissions Matrix */}
        {activeTab === 'permissions' && (
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            <p style={{ fontSize: 13, color: tokens.textMuted, margin: '0 0 14px' }}>
              Global feature flags. Disabling a feature enforces instant server-side restriction across all accounts.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {PERMISSION_KEYS.map((key) => {
                const isEnabled = permissions[key] !== false;
                return (
                  <div
                    key={key}
                    onClick={() => handleTogglePermission(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      backgroundColor: tokens.bgTertiary,
                      border: `1px solid ${tokens.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{key}</span>
                    <input type="checkbox" checked={isEnabled} readOnly style={{ cursor: 'pointer' }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: System Settings */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {t('qr_expiry_hours')}
              </label>
              <input
                type="number"
                value={Math.round((settings.qrExpirySeconds || 86400) / 3600)}
                onChange={(e) =>
                  setSettings({ ...settings, qrExpirySeconds: parseInt(e.target.value) * 3600 })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${tokens.border}`,
                  backgroundColor: tokens.bgTertiary,
                  color: tokens.textPrimary,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                {t('max_file_size_mb')}
              </label>
              <input
                type="number"
                value={settings.maxFileSizeMb || 25}
                onChange={(e) =>
                  setSettings({ ...settings, maxFileSizeMb: parseInt(e.target.value) })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${tokens.border}`,
                  backgroundColor: tokens.bgTertiary,
                  color: tokens.textPrimary,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                alignSelf: 'flex-end',
                padding: '10px 20px',
                borderRadius: 8,
                backgroundColor: tokens.primaryAccent,
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : t('save')}
            </button>
          </form>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.border}`, textAlign: 'left', color: tokens.textMuted }}>
                  <th style={{ padding: '6px' }}>Action</th>
                  <th style={{ padding: '6px' }}>Target</th>
                  <th style={{ padding: '6px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${tokens.borderSubtle}` }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '8px 6px', color: tokens.textSecondary }}>
                      {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                    </td>
                    <td style={{ padding: '8px 6px', color: tokens.textMuted }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
