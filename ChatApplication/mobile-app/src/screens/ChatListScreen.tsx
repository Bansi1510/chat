import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

export const ChatListScreen = ({ navigation }: any) => {
  const { theme, t, user, toggleTheme, setLanguage, language } = useAppStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    connectSocket();
    const socket = getSocket();

    socket.on('message:new', () => {
      fetchConversations();
    });

    return () => {
      socket.off('message:new');
    };
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.itemContainer, { borderBottomColor: theme.border }]}
      onPress={() =>
        navigation.navigate('ChatScreen', {
          conversationId: item.id,
          peer: item.peer,
        })
      }
    >
      <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
        <Text style={styles.avatarText}>
          {item.peer?.username?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.username, { color: theme.text }]}>
            {item.peer?.username || 'Unknown'}
          </Text>
          {item.lastMessage ? (
            <Text style={[styles.time, { color: theme.textSecondary }]}>
              {new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <Text
            numberOfLines={1}
            style={[styles.lastMessage, { color: theme.textSecondary }]}
          >
            {item.lastMessage?.ciphertext ? '🔒 [Encrypted message]' : 'No messages yet'}
          </Text>
          {item.unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>{t.chats}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('MyQRScreen')}
          >
            <Text style={styles.actionText}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('ScanQRScreen')}
          >
            <Text style={styles.actionText}>Scan</Text>
          </TouchableOpacity>
          {user?.role === 'superadmin' ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('AdminScreen')}
            >
              <Text style={styles.actionText}>Admin</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={toggleTheme}
          >
            <Text style={styles.actionText}>Theme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SettingsScreen')}
          >
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConversations();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No conversations yet. Scan another user's QR code to start!
              </Text>
            </View>
          }
        />
      )}
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
  },
});
