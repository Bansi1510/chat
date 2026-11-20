import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

export const MyQRScreen = ({ navigation }: any) => {
  const { theme, t, user } = useAppStore();
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQR = async () => {
    try {
      setLoading(true);
      const res = await api.get('/qr');
      setQrToken(res.data.data.rawToken);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const regenerateQR = async () => {
    try {
      setLoading(true);
      const res = await api.post('/qr/regenerate');
      setQrToken(res.data.data.rawToken);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.myQR}</Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.username, { color: theme.text }]}>@{user?.username}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Scan this code to immediately connect and chat.
          </Text>

          <View style={styles.qrContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : qrToken ? (
              <QRCode value={qrToken} size={220} />
            ) : (
              <Text style={{ color: theme.danger }}>Failed to load QR code</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.regenButton, { backgroundColor: theme.primary }]}
            onPress={regenerateQR}
            disabled={loading}
          >
            <Text style={styles.regenButtonText}>Regenerate QR Code</Text>
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
  body: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
  },
  regenButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  regenButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
