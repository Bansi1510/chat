import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

export const ScanQRScreen = ({ navigation }: any) => {
  const { theme, t } = useAppStore();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (rawCode: string) => {
    if (!rawCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/qr/scan', { token: rawCode.trim() });
      const { conversationId, user: peer } = res.data.data;
      navigation.replace('ChatScreen', { conversationId, peer });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to scan QR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.scanQR}</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.instruction, { color: theme.text }]}>
            Camera QR Scanning and Manual Token Entry
          </Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>
            Paste or scan the user's connection QR token below to start chatting directly without sending friend requests.
          </Text>

          {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

          <TextInput
            placeholder="User QR Token (format: <userId>:<token>)"
            placeholderTextColor={theme.textSecondary}
            value={tokenInput}
            onChangeText={setTokenInput}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={() => handleConnect(tokenInput)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Connect & Chat</Text>
            )}
          </TouchableOpacity>
        </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  instruction: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 15,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    marginBottom: 12,
    fontSize: 14,
  },
});
