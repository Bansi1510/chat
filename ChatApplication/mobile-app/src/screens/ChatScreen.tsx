import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export const ChatScreen = ({ route, navigation }: any) => {
  const { conversationId, peer } = route.params;
  const { theme, t, user } = useAppStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`);
      setMessages(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const socket = getSocket();

    socket.emit('chat:join', { conversationId });

    socket.on('message:new', (msg: any) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
        if (msg.senderId !== user?.id) {
          socket.emit('message:read', {
            messageIds: [msg.id],
            conversationId,
          });
        }
      }
    });

    socket.on('chat:typing', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) {
        setIsPeerTyping(data.isTyping);
      }
    });

    return () => {
      socket.off('message:new');
      socket.off('chat:typing');
    };
  }, [conversationId]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    const socket = getSocket();
    socket.emit('chat:typing', { conversationId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { conversationId, isTyping: false });
    }, 1500);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const clientMsgId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const socket = getSocket();
      socket.emit('message:send', {
        conversationId,
        clientMsgId,
        ciphertext: textToSend, // In production, native E2EE libsignal wrapper encrypts this payload
        type: 'text',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View
        style={[
          styles.bubbleWrapper,
          isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isMe ? theme.bubbleSender : theme.bubbleReceiver,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isMe ? theme.bubbleSenderText : theme.bubbleReceiverText },
            ]}
          >
            {item.ciphertext}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isMe ? (
              <Text
                style={[
                  styles.tick,
                  {
                    color: item.read
                      ? theme.tickBlue
                      : item.delivered
                      ? theme.tickDouble
                      : theme.tickSingle,
                  },
                ]}
              >
                {item.read ? '✓✓' : item.delivered ? '✓✓' : '✓'}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.peerName}>{peer?.username || 'Chat'}</Text>
          {isPeerTyping ? (
            <Text style={styles.typingText}>{t.typing}</Text>
          ) : (
            <Text style={styles.statusText}>{t.online}</Text>
          )}
        </View>
        <View style={styles.callBtns}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => alert('Audio Call: E2EE WebRTC')}
          >
            <Text style={styles.iconText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => alert('Video Call: E2EE WebRTC')}
          >
            <Text style={styles.iconText}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id || item.clientMsgId}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          placeholder={t.typeMessage}
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={handleTextChange}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.primary }]}
          onPress={handleSend}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 4,
  },
  backBtn: {
    padding: 8,
    marginRight: 6,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  peerName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#E0E0E0',
    fontSize: 12,
  },
  typingText: {
    color: '#A7F3D0',
    fontSize: 12,
    fontStyle: 'italic',
  },
  callBtns: {
    flexDirection: 'row',
  },
  iconBtn: {
    padding: 8,
    marginLeft: 8,
  },
  iconText: {
    fontSize: 18,
  },
  listContent: {
    padding: 12,
  },
  bubbleWrapper: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  bubbleWrapperRight: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    marginRight: 4,
  },
  tick: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});
