import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

export const AdminScreen = ({ navigation }: any) => {
  const { theme, t } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId: string, username: string) => {
    Alert.alert(
      'Delete User Account',
      `Are you sure you want to delete user @${username}? This will revoke their session and mark their account as deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${userId}`);
              fetchUsers();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error?.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.adminPanel}</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Registered Accounts</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.userCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View>
                  <Text style={[styles.username, { color: theme.text }]}>@{item.username}</Text>
                  <Text style={[styles.role, { color: theme.textSecondary }]}>
                    Role: {item.role} | Joined: {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {item.role !== 'superadmin' ? (
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: theme.danger }]}
                    onPress={() => handleDeleteUser(item._id, item.username)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.adminBadge, { color: theme.primary }]}>SuperAdmin</Text>
                )}
              </View>
            )}
          />
        )}
      </View>
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
    paddingHorizontal: 12,
    elevation: 4,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  role: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  adminBadge: {
    fontWeight: 'bold',
    fontSize: 13,
  },
});
