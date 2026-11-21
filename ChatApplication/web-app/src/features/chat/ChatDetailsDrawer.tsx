import React, { useState, useEffect } from 'react';
import { X, Phone, Video, Clock, Pin, VolumeX, ShieldAlert, Palette, Image as ImageIcon, FileText, Download } from 'lucide-react';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { Avatar } from '../../components/Avatar';
import { api } from '../../services/api';
import { DISAPPEARING_DURATIONS } from '../../../../shared/constants';

interface ChatDetailsDrawerProps {
  onStartCall: (type: 'audio' | 'video') => void;
}

interface SharedMediaItem {
  messageId: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSizeBytes: number;
  createdAt: string;
}

interface SharedDocumentItem {
  messageId: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSizeBytes: number;
  createdAt: string;
}

export const ChatDetailsDrawer: React.FC<ChatDetailsDrawerProps> = ({ onStartCall }) => {
  const {
    theme,
    activeConvo,
    setDetailsDrawerOpen,
    setConversations,
    setActiveConvo,
    blockedUsers,
    setBlockedUsers,
  } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [activeTab, setActiveTab] = useState<'settings' | 'media' | 'docs'>('settings');
  const [mediaItems, setMediaItems] = useState<SharedMediaItem[]>([]);
  const [docItems, setDocItems] = useState<SharedDocumentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (!activeConvo) return;
    if (activeTab === 'media') {
      setLoadingContent(true);
      api
        .get(`/conversations/${activeConvo.id}/media`)
        .then((res) => {
          const list = Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
            ? res.data
            : [];
          setMediaItems(list);
        })
        .catch((err) => {
          console.error(err);
          setMediaItems([]);
        })
        .finally(() => setLoadingContent(false));
    } else if (activeTab === 'docs') {
      setLoadingContent(true);
      api
        .get(`/conversations/${activeConvo.id}/documents`)
        .then((res) => {
          const list = Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
            ? res.data
            : [];
          setDocItems(list);
        })
        .catch((err) => {
          console.error(err);
          setDocItems([]);
        })
        .finally(() => setLoadingContent(false));
    }
  }, [activeTab, activeConvo?.id]);

  if (!activeConvo) return null;
  const peer = activeConvo.peer;
  const isBlocked = blockedUsers.some((u) => u.id === peer?.id);

  const handleUpdateSettings = async (patch: any) => {
    try {
      await api.patch(`/conversations/${activeConvo.id}/settings`, patch);
      const updated = { ...activeConvo, ...patch };
      setActiveConvo(updated);
      setConversations((prev) => prev.map((c) => (c.id === activeConvo.id ? updated : c)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlock = async () => {
    if (!peer) return;
    try {
      if (isBlocked) {
        await api.delete(`/users/${peer.id}/block`);
        setBlockedUsers(blockedUsers.filter((u) => u.id !== peer.id));
      } else {
        if (!confirm(`${t('block_user')} @${peer.username}?`)) return;
        await api.post(`/users/${peer.id}/block`);
        setBlockedUsers([...blockedUsers, { id: peer.id, username: peer.username }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        width: 320,
        height: '100%',
        backgroundColor: tokens.bgSecondary,
        borderLeft: `1px solid ${tokens.border}`,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${tokens.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: tokens.textPrimary }}>
          Contact Info
        </h4>
        <button
          onClick={() => setDetailsDrawerOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Peer Profile Card */}
      <div
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: `1px solid ${tokens.border}`,
          textAlign: 'center',
        }}
      >
        <Avatar name={peer?.username || '?'} url={peer?.avatarUrl} size={70} />
        <h3 style={{ margin: '10px 0 2px', fontSize: 17, color: tokens.textPrimary }}>
          @{peer?.username}
        </h3>
        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
          {t('connected')} • E2EE Active
        </span>

        {/* Call Shortcuts */}
        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <button
            onClick={() => onStartCall('audio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: tokens.bgTertiary,
              border: `1px solid ${tokens.border}`,
              color: tokens.primaryAccent,
              padding: '8px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Phone size={16} />
            <span>Audio</span>
          </button>

          <button
            onClick={() => onStartCall('video')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: tokens.bgTertiary,
              border: `1px solid ${tokens.border}`,
              color: tokens.primaryAccent,
              padding: '8px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Video size={16} />
            <span>Video</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${tokens.border}`,
          backgroundColor: tokens.bgTertiary,
        }}
      >
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderBottom: activeTab === 'settings' ? `2px solid ${tokens.primaryAccent}` : 'none',
            background: 'transparent',
            color: activeTab === 'settings' ? tokens.primaryAccent : tokens.textMuted,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Options
        </button>
        <button
          onClick={() => setActiveTab('media')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderBottom: activeTab === 'media' ? `2px solid ${tokens.primaryAccent}` : 'none',
            background: 'transparent',
            color: activeTab === 'media' ? tokens.primaryAccent : tokens.textMuted,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          style={{
            flex: 1,
            padding: '10px 0',
            border: 'none',
            borderBottom: activeTab === 'docs' ? `2px solid ${tokens.primaryAccent}` : 'none',
            background: 'transparent',
            color: activeTab === 'docs' ? tokens.primaryAccent : tokens.textMuted,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Docs
        </button>
      </div>

      {/* Tab 1: Settings & Preferences */}
      {activeTab === 'settings' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Disappearing Messages Duration Picker */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Clock size={16} color={tokens.primaryAccent} />
              <span style={{ fontSize: 13, fontWeight: 600, color: tokens.textPrimary }}>
                {t('disappearing_messages')}
              </span>
            </div>
            <select
              value={activeConvo.disappearingSeconds || 0}
              onChange={(e) => handleUpdateSettings({ disappearingSeconds: parseInt(e.target.value) })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${tokens.border}`,
                backgroundColor: tokens.bgTertiary,
                color: tokens.textPrimary,
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {DISAPPEARING_DURATIONS.map((d) => (
                <option key={d.seconds} value={d.seconds}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pin Chat Toggle */}
          <div
            onClick={() => handleUpdateSettings({ pinned: !activeConvo.pinned })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pin size={16} color={tokens.textMuted} />
              <span style={{ fontSize: 13, color: tokens.textPrimary }}>
                {activeConvo.pinned ? t('unpin_chat') : t('pin_chat')}
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeConvo.pinned}
              readOnly
              style={{ cursor: 'pointer' }}
            />
          </div>

          {/* Mute Notifications Toggle */}
          <div
            onClick={() => handleUpdateSettings({ muted: !activeConvo.muted })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '8px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <VolumeX size={16} color={tokens.textMuted} />
              <span style={{ fontSize: 13, color: tokens.textPrimary }}>
                {activeConvo.muted ? t('unmute_notifications') : t('mute_notifications')}
              </span>
            </div>
            <input
              type="checkbox"
              checked={activeConvo.muted}
              readOnly
              style={{ cursor: 'pointer' }}
            />
          </div>

          {/* Wallpaper Picker */}
          <div style={{ paddingTop: 8, borderTop: `1px solid ${tokens.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Palette size={16} color={tokens.secondaryAccent} />
              <span style={{ fontSize: 13, fontWeight: 600, color: tokens.textPrimary }}>
                {t('custom_wallpaper')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#f8fafc', '#f0fdf4', '#eff6ff', '#fdf2f8', '#1e293b'].map((color) => (
                <div
                  key={color}
                  onClick={() => handleUpdateSettings({ wallpaper: color })}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: color,
                    border: `2px solid ${activeConvo.wallpaperUrl === color ? tokens.primaryAccent : tokens.border}`,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Block User Action */}
          <div style={{ paddingTop: 12, borderTop: `1px solid ${tokens.border}` }}>
            <button
              onClick={handleToggleBlock}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: tokens.dangerBg,
                color: tokens.danger,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ShieldAlert size={16} />
              <span>{isBlocked ? t('unblock_user') : t('block_user')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Shared Media */}
      {activeTab === 'media' && (
        <div style={{ padding: '16px', flex: 1 }}>
          {loadingContent ? (
            <div style={{ textAlign: 'center', color: tokens.textMuted, padding: '24px 0', fontSize: 13 }}>
              Loading media...
            </div>
          ) : !Array.isArray(mediaItems) || mediaItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: tokens.textMuted, padding: '36px 12px' }}>
              <ImageIcon size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 13 }}>No shared media found</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {(Array.isArray(mediaItems) ? mediaItems : []).map((item, idx) => (
                <a
                  key={idx}
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'block',
                    backgroundColor: tokens.bgTertiary,
                    border: `1px solid ${tokens.border}`,
                  }}
                >
                  {item.fileType?.startsWith('video/') ? (
                    <video
                      src={item.fileUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={item.fileUrl}
                      alt={item.fileName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Shared Documents */}
      {activeTab === 'docs' && (
        <div style={{ padding: '16px', flex: 1 }}>
          {loadingContent ? (
            <div style={{ textAlign: 'center', color: tokens.textMuted, padding: '24px 0', fontSize: 13 }}>
              Loading documents...
            </div>
          ) : !Array.isArray(docItems) || docItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: tokens.textMuted, padding: '36px 12px' }}>
              <FileText size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 13 }}>No shared documents found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(Array.isArray(docItems) ? docItems : []).map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: tokens.bgTertiary,
                    border: `1px solid ${tokens.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <FileText size={20} color={tokens.primaryAccent} />
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: tokens.textPrimary,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          maxWidth: 160,
                        }}
                      >
                        {doc.fileName || 'Document'}
                      </div>
                      <div style={{ fontSize: 11, color: tokens.textMuted }}>
                        {formatFileSize(doc.fileSizeBytes)}
                      </div>
                    </div>
                  </div>
                  <a
                    href={doc.fileUrl}
                    download={doc.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      backgroundColor: tokens.bgSecondary,
                      color: tokens.primaryAccent,
                    }}
                  >
                    <Download size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
