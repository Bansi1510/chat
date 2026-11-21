import React, { useState } from 'react';
import { QrCode, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { api } from '../../services/api';

export const ScanQRModal: React.FC = () => {
  const { activeModal, setActiveModal, theme, setConversations, setActiveConvo } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/qr/scan', { token: tokenInput.trim() });
      const { conversationId, user } = res.data.data;

      // Refresh conversations list
      const convosRes = await api.get('/conversations');
      setConversations(convosRes.data.data);

      // Set active conversation immediately
      setActiveConvo({
        id: conversationId,
        peer: user,
        disappearingSeconds: 0,
        pinned: false,
        muted: false,
        unreadCount: 0,
      });

      setTokenInput('');
      setActiveModal('none');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to establish mutual connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'scan_qr'}
      onClose={() => setActiveModal('none')}
      title={t('connect_with_token')}
      maxWidth={440}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: tokens.primaryAccent + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.primaryAccent,
            }}
          >
            <QrCode size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: tokens.textPrimary }}>
              QR Pairing Engine
            </div>
            <div style={{ fontSize: 12, color: tokens.textMuted }}>
              Zero directory search • Instant 1:1 chat initialization
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 13, color: tokens.textSecondary, lineHeight: 1.45 }}>
          {t('paste_token_desc')}
        </p>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: tokens.dangerBg,
              color: tokens.danger,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <textarea
          rows={3}
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="e.g. 7b22...-uuid:a94f83c90f23b6..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.bgTertiary,
            color: tokens.textPrimary,
            fontSize: 13,
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'monospace',
            marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setActiveModal('none')}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              backgroundColor: 'transparent',
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>

          <button
            onClick={handleConnect}
            disabled={loading || !tokenInput.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 10,
              backgroundColor: tokens.primaryAccent,
              border: 'none',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading || !tokenInput.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !tokenInput.trim() ? 0.6 : 1,
            }}
          >
            <span>{loading ? 'Connecting...' : t('connect_button')}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
};
