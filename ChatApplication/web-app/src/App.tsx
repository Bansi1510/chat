import React, { useEffect, useState } from 'react';
import { useWebStore } from './store/useWebStore';
import { api } from './services/api';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';

export const App = () => {
  const { user, accessToken, setUser, logout } = useWebStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  // Main chat state
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Authentication
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    try {
      const res = await api.post(endpoint, {
        username,
        password,
        deviceName: 'Web Browser',
      });
      const { user: u, accessToken: at, refreshToken: rt } = res.data.data;
      setUser(u, at, rt);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication error');
    }
  };

  // Fetch Conversations
  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Messages for active chat
  const fetchMessages = async (convoId: string) => {
    try {
      const res = await api.get(`/conversations/${convoId}/messages`);
      setMessages(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Initialize Sockets and Convos on Auth
  useEffect(() => {
    if (!accessToken) return;
    fetchConversations();

    const s = io('http://localhost:4000', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    s.on('message:new', (msg: any) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: { ciphertext: msg.ciphertext, createdAt: msg.createdAt } }
            : c
        )
      );
      if (activeConvo && activeConvo.id === msg.conversationId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [accessToken, activeConvo?.id]);

  useEffect(() => {
    if (activeConvo) {
      fetchMessages(activeConvo.id);
    }
  }, [activeConvo]);

  // Load My QR
  const handleOpenQR = async () => {
    try {
      const res = await api.get('/qr');
      setQrToken(res.data.data.rawToken);
      setShowQRModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Scan & Connect QR
  const handleConnectQR = async () => {
    if (!scanInput.trim()) return;
    try {
      const res = await api.post('/qr/scan', { token: scanInput.trim() });
      setShowScanModal(false);
      setScanInput('');
      await fetchConversations();
      setActiveConvo({ id: res.data.data.conversationId, peer: res.data.data.user });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to connect');
    }
  };

  // Send Message
  const handleSend = () => {
    if (!inputMsg.trim() || !activeConvo || !socket) return;
    const clientMsgId = `${Date.now()}_${Math.random()}`;
    socket.emit('message:send', {
      conversationId: activeConvo.id,
      clientMsgId,
      ciphertext: inputMsg.trim(),
      type: 'text',
    });
    setInputMsg('');
  };

  if (!accessToken) {
    return (
      <div style={styles.authWrapper}>
        <div style={styles.authBox}>
          <h2 style={{ color: '#075E54', marginBottom: 8 }}>SecureChat Web</h2>
          <p style={{ color: '#667781', marginBottom: 20 }}>
            {isRegister ? 'Create an account to start' : 'Sign in to access your conversations'}
          </p>
          {error && <div style={styles.authError}>{error}</div>}
          <form onSubmit={handleAuth}>
            <input
              style={styles.input}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={styles.primaryBtn} type="submit">
              {isRegister ? 'Register' : 'Login'}
            </button>
          </form>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <span
              style={{ color: '#128C7E', cursor: 'pointer', fontSize: 14 }}
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>@{user?.username}</div>
          <div>
            <button style={styles.headerBtn} onClick={handleOpenQR}>
              My QR
            </button>
            <button style={styles.headerBtn} onClick={() => setShowScanModal(true)}>
              Scan QR
            </button>
            <button style={{ ...styles.headerBtn, background: '#ef4444' }} onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.conversationList}>
          {conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#667781', fontSize: 14 }}>
              No chats yet. Click "Scan QR" to connect with a peer!
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConvo(c)}
                style={{
                  ...styles.convoItem,
                  backgroundColor: activeConvo?.id === c.id ? '#f0f2f5' : '#ffffff',
                }}
              >
                <div style={styles.avatar}>
                  {c.peer?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 15 }}>{c.peer?.username}</div>
                  <div style={{ fontSize: 13, color: '#667781', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.lastMessage ? c.lastMessage.ciphertext : 'No messages yet'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div style={styles.chatArea}>
        {activeConvo ? (
          <>
            <div style={styles.chatHeader}>
              <div style={styles.avatar}>{activeConvo.peer?.username?.charAt(0).toUpperCase()}</div>
              <div style={{ marginLeft: 12 }}>
                <div style={{ fontWeight: 'bold' }}>{activeConvo.peer?.username}</div>
                <div style={{ fontSize: 12, color: '#10b981' }}>Connected</div>
              </div>
            </div>

            <div style={styles.messageList}>
              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div
                    key={m.id || m.clientMsgId}
                    style={{
                      display: 'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      margin: '6px 0',
                    }}
                  >
                    <div
                      style={{
                        ...styles.bubble,
                        backgroundColor: isMe ? '#d9fdd3' : '#ffffff',
                      }}
                    >
                      <div>{m.ciphertext}</div>
                      <div style={styles.msgTime}>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.inputRow}>
              <input
                style={styles.chatInput}
                placeholder="Type a message..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button style={styles.sendBtn} onClick={handleSend}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={styles.emptyPlaceholder}>
            <h3>Select a conversation or scan a QR code to start chatting</h3>
          </div>
        )}
      </div>

      {/* QR Modals */}
      {showQRModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3>My Connection QR Code</h3>
            <p style={{ fontSize: 13, color: '#667781', margin: '8px 0 16px' }}>
              Other users can scan this QR code on mobile or web to chat instantly.
            </p>
            <div style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
              {qrToken ? <QRCodeSVG value={qrToken} size={220} /> : 'Loading...'}
            </div>
            <button style={{ ...styles.primaryBtn, marginTop: 16 }} onClick={() => setShowQRModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showScanModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3>Connect with QR Token</h3>
            <p style={{ fontSize: 13, color: '#667781', margin: '8px 0 16px' }}>
              Paste the peer's raw QR string (format: &lt;userId&gt;:&lt;token&gt;)
            </p>
            <input
              style={styles.input}
              placeholder="Paste QR token string..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button style={styles.primaryBtn} onClick={handleConnectQR}>
                Connect & Chat
              </button>
              <button
                style={{ ...styles.primaryBtn, background: '#8696a0' }}
                onClick={() => setShowScanModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  authWrapper: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#e4e7eb',
  },
  authBox: {
    width: 380,
    background: '#ffffff',
    padding: 32,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  authError: {
    padding: 8,
    background: '#fef2f2',
    color: '#ef4444',
    borderRadius: 6,
    marginBottom: 12,
    fontSize: 13,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    marginBottom: 14,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    background: '#075E54',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 14,
  },
  appContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
  },
  sidebar: {
    width: 360,
    borderRight: '1px solid #e9edef',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
  },
  sidebarHeader: {
    padding: '16px',
    background: '#f0f2f5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e9edef',
  },
  headerBtn: {
    padding: '6px 10px',
    marginLeft: 6,
    background: '#075E54',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
  },
  conversationList: {
    flex: 1,
    overflowY: 'auto',
  },
  convoItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f2f5',
    cursor: 'pointer',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: '#128C7E',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    marginRight: 12,
    flexShrink: 0,
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#efeae2',
  },
  chatHeader: {
    padding: '12px 20px',
    background: '#f0f2f5',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #e9edef',
  },
  messageList: {
    flex: 1,
    padding: '16px 24px',
    overflowY: 'auto',
  },
  bubble: {
    maxWidth: '65%',
    padding: '8px 14px',
    borderRadius: 8,
    boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
    fontSize: 14,
  },
  msgTime: {
    fontSize: 10,
    color: '#667781',
    textAlign: 'right',
    marginTop: 4,
  },
  inputRow: {
    padding: '12px 20px',
    background: '#f0f2f5',
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    padding: '12px 18px',
    borderRadius: 24,
    border: 'none',
    outline: 'none',
    fontSize: 14,
  },
  sendBtn: {
    padding: '12px 20px',
    background: '#075E54',
    color: '#ffffff',
    border: 'none',
    borderRadius: 20,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  emptyPlaceholder: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#667781',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  modalCard: {
    background: '#ffffff',
    padding: 24,
    borderRadius: 12,
    width: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};
