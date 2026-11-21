import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare,
  Star,
  Clock,
  QrCode,
  Scan,
  Settings,
  Shield,
  LogOut,
  Moon,
  Sun,
  Phone,
  Video,
  Info,
} from 'lucide-react';
import { useWebStore, Message } from './store/useWebStore';
import { useTranslation } from './localization/useTranslation';
import { lightTokens, darkTokens } from './theme/theme';
import { api } from './services/api';
import { Avatar } from './components/Avatar';
import { AuthScreen } from './features/auth/AuthScreen';
import { ChatList } from './features/chat/ChatList';
import { MessageBubble } from './features/chat/MessageBubble';
import { ChatInputBar } from './features/chat/ChatInputBar';
import { ChatDetailsDrawer } from './features/chat/ChatDetailsDrawer';
import { MyQRModal } from './features/qr/MyQRModal';
import { ScanQRModal } from './features/qr/ScanQRModal';
import { CallModal } from './features/calling/CallModal';
import { AdminDashboardModal } from './features/admin/AdminDashboardModal';
import { SettingsModal } from './features/settings/SettingsModal';
import { BackupModal } from './features/backup/BackupModal';
import { ScheduledMessagesModal } from './features/scheduled/ScheduledMessagesModal';
import { StarredMessagesModal } from './features/starred/StarredMessagesModal';

export const App: React.FC = () => {
  const {
    user,
    accessToken,
    theme,
    setTheme,
    setConversations,
    activeConvo,
    setActiveConvo,
    messages,
    setMessages,
    activeCall,
    setActiveCall,
    isDetailsDrawerOpen,
    setDetailsDrawerOpen,
    setActiveModal,
    logout,
  } = useWebStore();

  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerRecording, setPeerRecording] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, peerTyping, peerRecording]);

  // Fetch initial conversations list
  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (convoId: string) => {
    try {
      const res = await api.get(`/conversations/${convoId}/messages`);
      setMessages(res.data.data);

      // Send read receipt for unread peer messages
      const unreadIds = res.data.data
        .filter((m: Message) => m.senderId !== user?.id && !m.read)
        .map((m: Message) => m.id);

      if (unreadIds.length > 0 && socket) {
        socket.emit('message:read', { messageIds: unreadIds, conversationId: convoId });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeConvo) {
      fetchMessages(activeConvo.id);
      setPeerTyping(false);
      setPeerRecording(false);
    }
  }, [activeConvo?.id]);

  // Socket.IO Setup
  useEffect(() => {
    if (!accessToken) return;
    fetchConversations();

    const socketUrl = (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:4000';
    const s = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    s.on('connect', () => {
      console.log('Socket connected:', s.id);
    });

    s.on('message:new', (msg: Message) => {
      // Append to active conversation if open
      if (activeConvo && activeConvo.id === msg.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id || (m.clientMsgId && m.clientMsgId === msg.clientMsgId))) {
            return prev.map((m) => (m.clientMsgId === msg.clientMsgId ? msg : m));
          }
          return [...prev, msg];
        });

        // Acknowledge read if actively viewing chat
        if (msg.senderId !== user?.id) {
          s.emit('message:read', { messageIds: [msg.id], conversationId: msg.conversationId });
        }
      }

      // Update conversation last message preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessage: {
                  id: msg.id,
                  senderId: msg.senderId,
                  ciphertext: msg.ciphertext,
                  type: msg.type,
                  createdAt: msg.createdAt,
                  delivered: msg.delivered,
                  read: msg.read,
                },
                unreadCount:
                  activeConvo?.id === msg.conversationId || msg.senderId === user?.id
                    ? 0
                    : c.unreadCount + 1,
              }
            : c
        )
      );
    });

    s.on('message:delivered', (data: { messageIds: string[]; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (data.messageIds.includes(m.id) ? { ...m, delivered: true } : m))
      );
    });

    s.on('message:read', (data: { messageIds: string[]; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (data.messageIds.includes(m.id) ? { ...m, delivered: true, read: true } : m))
      );
    });

    s.on('chat:typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (activeConvo && activeConvo.id === data.conversationId && data.userId !== user?.id) {
        setPeerTyping(data.isTyping);
      }
    });

    s.on('chat:recording', (data: { conversationId: string; userId: string; isRecording: boolean }) => {
      if (activeConvo && activeConvo.id === data.conversationId && data.userId !== user?.id) {
        setPeerRecording(data.isRecording);
      }
    });

    s.on('call:incoming', (data: any) => {
      setActiveCall({
        peerId: data.callerId,
        peerUsername: data.callerUsername || 'Peer',
        callType: data.type || 'audio',
        state: 'incoming',
        isMuted: false,
        isVideoEnabled: data.type === 'video',
        durationSeconds: 0,
      });
    });

    s.on('call:answered', () => {
      setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
    });

    s.on('call:ended', () => {
      setActiveCall(null);
    });

    s.on('session:revoked', () => {
      alert('Your session was revoked because a new device logged in.');
      logout();
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [accessToken, activeConvo?.id]);

  // Call Actions
  const handleStartCall = (type: 'audio' | 'video') => {
    if (!activeConvo?.peer || !socket) return;
    setActiveCall({
      peerId: activeConvo.peer.id,
      peerUsername: activeConvo.peer.username,
      peerAvatar: activeConvo.peer.avatarUrl,
      callType: type,
      state: 'outgoing',
      isMuted: false,
      isVideoEnabled: type === 'video',
      durationSeconds: 0,
    });

    socket.emit('call:offer', {
      targetUserId: activeConvo.peer.id,
      type,
      offer: { type: 'offer', sdp: 'simulated_dtls_srtp_sdp' },
      dtlsFingerprint: 'SHA256:7B:4A:...',
    });
  };

  const handleAcceptCall = () => {
    if (!activeCall || !socket) return;
    setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
    socket.emit('call:answer', {
      targetUserId: activeCall.peerId,
      answer: { type: 'answer', sdp: 'simulated_answer_sdp' },
      dtlsFingerprint: 'SHA256:7B:4A:...',
    });
  };

  const handleEndCall = () => {
    if (activeCall && socket) {
      socket.emit('call:end', { targetUserId: activeCall.peerId });
      // Log call
      api.post('/calls/log', {
        calleeId: activeCall.peerId,
        callType: activeCall.callType,
        status: activeCall.durationSeconds > 0 ? 'completed' : 'missed',
        durationSeconds: activeCall.durationSeconds,
      }).catch(console.error);
    }
    setActiveCall(null);
  };

  if (!accessToken) {
    return <AuthScreen />;
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        backgroundColor: tokens.bgPrimary,
        color: tokens.textPrimary,
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 1. Left Navigation Rail */}
      <div
        style={{
          width: 68,
          backgroundColor: tokens.bgSecondary,
          borderRight: `1px solid ${tokens.border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          boxSizing: 'border-box',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Top brand & nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ marginBottom: 8 }}>
            <Avatar name={user?.username || '?'} url={user?.avatarUrl} size={42} />
          </div>

          <button
            onClick={() => setActiveConvo(null)}
            title={t('chats')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: tokens.primaryAccent + '18',
              color: tokens.primaryAccent,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageSquare size={20} />
          </button>

          <button
            onClick={() => setActiveModal('starred')}
            title={t('starred')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'transparent',
              color: tokens.textMuted,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Star size={20} />
          </button>

          <button
            onClick={() => setActiveModal('scheduled')}
            title={t('scheduled')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'transparent',
              color: tokens.textMuted,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={20} />
          </button>

          <button
            onClick={() => setActiveModal('my_qr')}
            title={t('my_qr')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'transparent',
              color: tokens.textMuted,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrCode size={20} />
          </button>

          <button
            onClick={() => setActiveModal('scan_qr')}
            title={t('scan_qr')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'transparent',
              color: tokens.textMuted,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Scan size={20} />
          </button>

          {/* Super Admin Shield */}
          {user?.role === 'superadmin' && (
            <button
              onClick={() => setActiveModal('admin')}
              title={t('admin_dashboard')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#f59e0b18',
                color: '#f59e0b',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} />
            </button>
          )}
        </div>

        {/* Bottom items: Theme, Settings, Logout */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={t('theme')}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.textMuted,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 10,
              display: 'flex',
            }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => setActiveModal('settings')}
            title={t('settings')}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.textMuted,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 10,
              display: 'flex',
            }}
          >
            <Settings size={20} />
          </button>

          <button
            onClick={logout}
            title={t('logout')}
            style={{
              background: 'transparent',
              border: 'none',
              color: tokens.danger,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 10,
              display: 'flex',
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* 2. Column 2: Conversations List Panel */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          height: '100%',
        }}
      >
        <ChatList />
      </div>

      {/* 3. Column 3: Main Active Conversation Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: activeConvo?.wallpaperUrl || tokens.bgPrimary,
          position: 'relative',
        }}
      >
        {activeConvo ? (
          <>
            {/* Conversation Header */}
            <div
              style={{
                height: 64,
                padding: '0 20px',
                backgroundColor: tokens.bgSecondary,
                borderBottom: `1px solid ${tokens.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar
                  name={activeConvo.peer?.username || '?'}
                  url={activeConvo.peer?.avatarUrl}
                  size={42}
                  isOnline={
                    !!activeConvo.peer?.lastSeenAt &&
                    new Date().getTime() - new Date(activeConvo.peer.lastSeenAt).getTime() < 120000
                  }
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: tokens.textPrimary }}>
                    @{activeConvo.peer?.username}
                  </div>
                  <div style={{ fontSize: 12, color: tokens.textMuted }}>
                    {peerRecording
                      ? t('recording')
                      : peerTyping
                      ? t('typing')
                      : `${t('connected')} • E2EE`}
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => handleStartCall('audio')}
                  title={t('voice_call')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: tokens.textSecondary,
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8,
                    display: 'flex',
                  }}
                >
                  <Phone size={19} />
                </button>

                <button
                  onClick={() => handleStartCall('video')}
                  title={t('video_call')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: tokens.textSecondary,
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8,
                    display: 'flex',
                  }}
                >
                  <Video size={19} />
                </button>

                <button
                  onClick={() => setDetailsDrawerOpen(!isDetailsDrawerOpen)}
                  title="Details"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isDetailsDrawerOpen ? tokens.primaryAccent : tokens.textSecondary,
                    cursor: 'pointer',
                    padding: 8,
                    borderRadius: 8,
                    display: 'flex',
                  }}
                >
                  <Info size={19} />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {messages.map((m) => (
                <MessageBubble
                  key={m.id || m.clientMsgId}
                  message={m}
                  isMe={m.senderId === user?.id}
                  onReply={(msg) => setReplyTo(msg)}
                />
              ))}

              {/* Typing indicator bounce */}
              {peerTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0' }}>
                  <div
                    style={{
                      backgroundColor: tokens.bgSecondary,
                      padding: '8px 14px',
                      borderRadius: 16,
                      fontSize: 12,
                      color: tokens.textMuted,
                      border: `1px solid ${tokens.border}`,
                    }}
                  >
                    @{activeConvo.peer?.username} is typing...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <ChatInputBar
              socket={socket}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
            />
          </>
        ) : (
          /* Empty Placeholder Stage */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: tokens.primaryAccent + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.primaryAccent,
                marginBottom: 16,
              }}
            >
              <MessageSquare size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: tokens.textPrimary }}>
              {t('app_title')} Web Client
            </h3>
            <p style={{ margin: 0, maxWidth: 360, fontSize: 14, color: tokens.textSecondary, lineHeight: 1.5 }}>
              Select a conversation from the sidebar or click "Scan QR" to connect with a peer.
            </p>
          </div>
        )}
      </div>

      {/* 4. Column 4 (Collapsible): Contact Details Drawer */}
      {isDetailsDrawerOpen && activeConvo && (
        <ChatDetailsDrawer onStartCall={handleStartCall} />
      )}

      {/* Modals & Overlays */}
      <MyQRModal />
      <ScanQRModal />
      <CallModal
        onAccept={handleAcceptCall}
        onReject={handleEndCall}
        onEnd={handleEndCall}
        onToggleMic={() =>
          setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null))
        }
        onToggleVideo={() =>
          setActiveCall((prev) =>
            prev ? { ...prev, isVideoEnabled: !prev.isVideoEnabled } : null
          )
        }
      />
      <AdminDashboardModal />
      <SettingsModal />
      <BackupModal />
      <ScheduledMessagesModal />
      <StarredMessagesModal />
    </div>
  );
};
