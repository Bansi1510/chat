import React, { useState } from 'react';
import { Search, Pin, VolumeX, Check, CheckCheck } from 'lucide-react';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { Avatar } from '../../components/Avatar';

export const ChatList: React.FC = () => {
  const { theme, conversations, activeConvo, setActiveConvo, user } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;
  const [query, setQuery] = useState('');

  const filtered = conversations.filter((c) => {
    const peerName = c.peer?.username?.toLowerCase() || '';
    const lastMsg = c.lastMessage?.ciphertext?.toLowerCase() || '';
    const q = query.toLowerCase();
    return peerName.includes(q) || lastMsg.includes(q);
  });

  // Sort pinned chats to top
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: tokens.bgSecondary,
        borderRight: `1px solid ${tokens.border}`,
      }}
    >
      {/* Search Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${tokens.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: tokens.bgTertiary,
            borderRadius: 10,
            padding: '8px 12px',
            border: `1px solid ${tokens.border}`,
          }}
        >
          <Search size={16} color={tokens.textMuted} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
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
      </div>

      {/* Conversation Items List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              color: tokens.textMuted,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: tokens.textSecondary }}>
              {t('no_chats_title')}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              {t('no_chats_desc')}
            </div>
          </div>
        ) : (
          sorted.map((convo) => {
            const isActive = activeConvo?.id === convo.id;
            const peer = convo.peer;
            const lastMsg = convo.lastMessage;
            const isMeLast = lastMsg?.senderId === user?.id;

            return (
              <div
                key={convo.id}
                onClick={() => setActiveConvo(convo)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? (theme === 'dark' ? '#1e293b' : '#f1f5f9') : 'transparent',
                  borderBottom: `1px solid ${tokens.borderSubtle}`,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Avatar
                  name={peer?.username || '?'}
                  url={peer?.avatarUrl}
                  size={46}
                  isOnline={!!peer?.lastSeenAt && new Date().getTime() - new Date(peer.lastSeenAt).getTime() < 120000}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        color: tokens.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {peer?.username || 'Peer'}
                    </span>

                    {lastMsg?.createdAt && (
                      <span style={{ fontSize: 11, color: tokens.textMuted, flexShrink: 0 }}>
                        {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: convo.unreadCount > 0 ? tokens.textPrimary : tokens.textMuted,
                        fontWeight: convo.unreadCount > 0 ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {isMeLast && (
                        <span>
                          {lastMsg?.read ? (
                            <CheckCheck size={14} color={tokens.readTick} />
                          ) : lastMsg?.delivered ? (
                            <CheckCheck size={14} color={tokens.textMuted} />
                          ) : (
                            <Check size={14} color={tokens.textMuted} />
                          )}
                        </span>
                      )}
                      <span>{lastMsg ? lastMsg.ciphertext : 'Start chatting...'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {convo.pinned && <Pin size={13} color={tokens.primaryAccent} fill={tokens.primaryAccent} />}
                      {convo.muted && <VolumeX size={13} color={tokens.textMuted} />}
                      {convo.unreadCount > 0 && (
                        <div
                          style={{
                            backgroundColor: tokens.primaryAccent,
                            color: '#ffffff',
                            borderRadius: '50%',
                            minWidth: 18,
                            height: 18,
                            padding: '0 4px',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {convo.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
