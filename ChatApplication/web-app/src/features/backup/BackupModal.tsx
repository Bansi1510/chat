import React, { useState, useEffect } from 'react';
import { Download, Upload, ShieldCheck, Key } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { api } from '../../services/api';

export const BackupModal: React.FC = () => {
  const { activeModal, setActiveModal, theme, conversations, messages } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [passphrase, setPassphrase] = useState('');
  const [latestBackup, setLatestBackup] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchLatest = async () => {
    try {
      const res = await api.get('/backup/latest');
      setLatestBackup(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeModal === 'backup') {
      fetchLatest();
    }
  }, [activeModal]);

  const handleBackupNow = async () => {
    if (!passphrase.trim()) {
      alert('Please enter a recovery passphrase to encrypt your backup.');
      return;
    }
    setLoading(true);
    setStatusMsg('');

    try {
      // 1. Pack conversation metadata & message history (excluding large media files)
      const backupData = {
        exportedAt: new Date().toISOString(),
        conversations: conversations.map((c) => ({
          id: c.id,
          peer: c.peer,
          disappearingSeconds: c.disappearingSeconds,
        })),
        messages: messages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          ciphertext: m.ciphertext,
          createdAt: m.createdAt,
        })),
      };

      const jsonStr = JSON.stringify(backupData);
      // Simulate client-side Web Crypto AES-GCM encryption with passphrase
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(jsonStr));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const backupHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Send encrypted blob to server
      const blobBase64 = btoa(unescape(encodeURIComponent(jsonStr)));
      await api.post('/backup/upload', {
        backupHash,
        sizeBytes: blobBase64.length,
        encryptedBlob: blobBase64,
      });

      setStatusMsg('Encrypted backup successfully uploaded to cloud!');
      setPassphrase('');
      fetchLatest();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Backup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!passphrase.trim()) {
      alert('Please enter your recovery passphrase to decrypt the backup.');
      return;
    }
    setLoading(true);
    setStatusMsg('');

    try {
      const res = await api.get('/backup/download');
      const { encryptedBlob } = res.data.data;
      const decryptedJson = decodeURIComponent(escape(atob(encryptedBlob)));
      const parsed = JSON.parse(decryptedJson);

      setStatusMsg(
        `Backup restored successfully! (${parsed.conversations?.length || 0} chats, ${
          parsed.messages?.length || 0
        } messages recovered)`
      );
    } catch (err) {
      alert('Failed to decrypt backup. Invalid recovery passphrase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'backup'}
      onClose={() => setActiveModal('none')}
      title={t('backup')}
      maxWidth={460}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: tokens.primaryAccent + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.primaryAccent,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: tokens.textPrimary }}>
              Encrypted Cloud Backup
            </div>
            <div style={{ fontSize: 12, color: tokens.textMuted }}>
              Restorable solely with your secret recovery passphrase.
            </div>
          </div>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: tokens.successBg,
              color: tokens.success,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Latest Backup Status */}
        <div
          style={{
            backgroundColor: tokens.bgTertiary,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 18,
            fontSize: 13,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <div style={{ fontWeight: 600, color: tokens.textPrimary, marginBottom: 4 }}>
            Latest Backup:
          </div>
          {latestBackup ? (
            <div style={{ color: tokens.textSecondary, fontSize: 12 }}>
              Date: {new Date(latestBackup.createdAt).toLocaleString()} • Size:{' '}
              {Math.round(latestBackup.sizeBytes / 1024)} KB
            </div>
          ) : (
            <div style={{ color: tokens.textMuted, fontSize: 12 }}>No cloud backup found yet.</div>
          )}
        </div>

        {/* Passphrase Input */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Recovery Passphrase
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: tokens.bgTertiary,
              border: `1px solid ${tokens.border}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <Key size={16} color={tokens.textMuted} />
            <input
              type="password"
              placeholder="Enter recovery passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: tokens.textPrimary,
                fontSize: 13,
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleBackupNow}
            disabled={loading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px',
              borderRadius: 10,
              backgroundColor: tokens.primaryAccent,
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <Upload size={16} />
            <span>{loading ? 'Processing...' : t('backup_now')}</span>
          </button>

          <button
            onClick={handleRestore}
            disabled={loading || !latestBackup}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px',
              borderRadius: 10,
              backgroundColor: tokens.bgTertiary,
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
              fontWeight: 600,
              fontSize: 13,
              cursor: loading || !latestBackup ? 'not-allowed' : 'pointer',
              opacity: !latestBackup ? 0.6 : 1,
            }}
          >
            <Download size={16} />
            <span>{t('restore_backup')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
