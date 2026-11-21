import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { api } from '../../services/api';

export const MyQRModal: React.FC = () => {
  const { activeModal, setActiveModal, theme } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [qrToken, setQrToken] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchQR = async () => {
    setLoading(true);
    try {
      const res = await api.get('/qr');
      setQrToken(res.data.data.rawToken);
      setExpiresAt(res.data.data.expiresAt);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const regenerateQR = async () => {
    setLoading(true);
    try {
      const res = await api.post('/qr/regenerate');
      setQrToken(res.data.data.rawToken);
      setExpiresAt(res.data.data.expiresAt);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeModal === 'my_qr') {
      fetchQR();
    }
  }, [activeModal]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={activeModal === 'my_qr'}
      onClose={() => setActiveModal('none')}
      title={t('my_qr_title')}
      maxWidth={400}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: tokens.textSecondary, lineHeight: 1.45 }}>
          {t('my_qr_desc')}
        </p>

        {/* High contrast QR box */}
        <div
          style={{
            padding: 20,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            marginBottom: 16,
          }}
        >
          {loading ? (
            <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>Generating QR...</span>
            </div>
          ) : qrToken ? (
            <QRCodeSVG value={qrToken} size={220} level="H" includeMargin />
          ) : (
            <div>Failed to load QR</div>
          )}
        </div>

        <div style={{ fontSize: 12, color: tokens.textMuted, marginBottom: 18 }}>
          Expires:{' '}
          {expiresAt
            ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Configured by Admin'}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={copyToClipboard}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px',
              borderRadius: 10,
              backgroundColor: tokens.bgTertiary,
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : t('copy_token')}</span>
          </button>

          <button
            onClick={regenerateQR}
            disabled={loading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px',
              borderRadius: 10,
              backgroundColor: tokens.primaryAccent,
              border: 'none',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{t('regenerate_qr')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
