import React, { useState } from 'react';
import { Check, CheckCheck, FileText, Download, Star, Trash2, Reply, Smile, MapPin } from 'lucide-react';
import { useWebStore, Message } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { api } from '../../services/api';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply?: (msg: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, onReply }) => {
  const { theme, user, setMessages } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleReact = async (emoji: string) => {
    setShowEmojiPicker(false);
    try {
      await api.post(`/messages/${message.id}/react`, { emoji });
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== message.id) return m;
          const otherReactions = (m.reactions || []).filter((r) => r.userId !== user?.id);
          return {
            ...m,
            reactions: [...otherReactions, { userId: user?.id || '', emoji }],
          };
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleStar = async () => {
    const nextStar = !message.starred;
    try {
      await api.post(`/messages/${message.id}/star`, { star: nextStar });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, starred: nextStar } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (forEveryone: boolean) => {
    if (!confirm(forEveryone ? t('delete_for_everyone') + '?' : t('delete_for_me') + '?')) return;
    try {
      await api.delete(`/messages/${message.id}?forEveryone=${forEveryone}`);
      if (forEveryone) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, deletedForEveryone: true, ciphertext: '' } : m))
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        marginBottom: 10,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: isMe ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 6,
          maxWidth: '75%',
        }}
      >
        {/* The Bubble */}
        <div
          style={{
            backgroundColor: isMe ? tokens.bubbleMe : tokens.bubblePeer,
            color: isMe ? tokens.bubbleMeText : tokens.bubblePeerText,
            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            padding: '10px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            border: `1px solid ${isMe ? tokens.primaryAccent + '22' : tokens.border}`,
            position: 'relative',
            wordBreak: 'break-word',
          }}
        >
          {/* Deleted state */}
          {message.deletedForEveryone ? (
            <div style={{ fontStyle: 'italic', color: tokens.textMuted, fontSize: 13 }}>
              🚫 {t('deleted_message')}
            </div>
          ) : (
            <>
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {message.attachments.map((att, idx) => {
                    const isImg = att.fileType.startsWith('image/');
                    return isImg ? (
                      <img
                        key={idx}
                        src={att.fileUrl}
                        alt={att.fileName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 280,
                          borderRadius: 12,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          backgroundColor: isMe ? tokens.bubbleMeText + '11' : tokens.bgTertiary,
                          padding: '8px 12px',
                          borderRadius: 10,
                        }}
                      >
                        <FileText size={24} color={tokens.primaryAccent} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {att.fileName}
                          </div>
                          <div style={{ fontSize: 11, color: tokens.textMuted }}>
                            {Math.round(att.fileSizeBytes / 1024)} KB
                          </div>
                        </div>
                        <a
                          href={att.fileUrl}
                          download={att.fileName}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: tokens.primaryAccent }}
                        >
                          <Download size={18} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Location message */}
              {message.type === 'location' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <MapPin size={18} color="#ef4444" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Live Location Stream</span>
                </div>
              )}

              {/* Message text */}
              {message.ciphertext && (
                <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.ciphertext}</div>
              )}

              {/* Time & Delivery ticks footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 4,
                  marginTop: 4,
                  fontSize: 11,
                  color: isMe ? tokens.bubbleMeText + 'aa' : tokens.textMuted,
                }}
              >
                {message.starred && <Star size={11} fill="#eab308" color="#eab308" />}
                <span>{formatTime(message.createdAt)}</span>
                {isMe && (
                  <span>
                    {message.read ? (
                      <CheckCheck size={14} color={tokens.readTick} strokeWidth={2.5} />
                    ) : message.delivered ? (
                      <CheckCheck size={14} color={tokens.textMuted} strokeWidth={2.5} />
                    ) : (
                      <Check size={14} color={tokens.textMuted} strokeWidth={2.5} />
                    )}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Floating Quick Actions Bar */}
        {showActions && !message.deletedForEveryone && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              backgroundColor: tokens.bgElevated,
              border: `1px solid ${tokens.border}`,
              borderRadius: 8,
              padding: '2px 4px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          >
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="React"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: tokens.textMuted,
                padding: 4,
                display: 'flex',
              }}
            >
              <Smile size={14} />
            </button>
            <button
              onClick={handleStar}
              title={message.starred ? t('unstar') : t('star')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: message.starred ? '#eab308' : tokens.textMuted,
                padding: 4,
                display: 'flex',
              }}
            >
              <Star size={14} fill={message.starred ? '#eab308' : 'none'} />
            </button>
            {onReply && (
              <button
                onClick={() => onReply(message)}
                title={t('reply')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: tokens.textMuted,
                  padding: 4,
                  display: 'flex',
                }}
              >
                <Reply size={14} />
              </button>
            )}
            <button
              onClick={() => handleDelete(isMe)}
              title={isMe ? t('delete_for_everyone') : t('delete_for_me')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: tokens.danger,
                padding: 4,
                display: 'flex',
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Emoji Reactions Picker Dropdown */}
      {showEmojiPicker && (
        <div
          style={{
            position: 'absolute',
            top: -34,
            [isMe ? 'right' : 'left']: 0,
            display: 'flex',
            gap: 6,
            backgroundColor: tokens.bgElevated,
            border: `1px solid ${tokens.border}`,
            borderRadius: 20,
            padding: '4px 10px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
            zIndex: 10,
          }}
        >
          {['❤️', '👍', '😂', '🔥', '👏', '🙏'].map((emoji) => (
            <span
              key={emoji}
              onClick={() => handleReact(emoji)}
              style={{ cursor: 'pointer', fontSize: 16, userSelect: 'none' }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* Displayed Emoji Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginTop: -6,
            [isMe ? 'marginRight' : 'marginLeft']: 8,
            backgroundColor: tokens.bgElevated,
            border: `1px solid ${tokens.border}`,
            borderRadius: 12,
            padding: '2px 8px',
            fontSize: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => {
            const count = message.reactions?.filter((r) => r.emoji === emoji).length || 0;
            return (
              <span key={emoji} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <span>{emoji}</span>
                {count > 1 && <span style={{ fontSize: 10, color: tokens.textMuted }}>{count}</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
