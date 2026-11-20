import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

export const RegisterScreen = ({ navigation }: any) => {
  const { theme, t, setUser, setPermissions } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password) {
      setError('Please fill in both fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', {
        username: username.trim(),
        password,
        deviceName: 'Android Mobile',
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setUser(user, accessToken, refreshToken);

      const permRes = await api.get('/me/permissions');
      setPermissions(permRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.primary }]}>{t.appName}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t.register}</Text>

        {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

        <TextInput
          placeholder={t.username}
          placeholderTextColor={theme.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />

        <TextInput
          placeholder={t.password}
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{t.registerAction}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.switchButton}
        >
          <Text style={[styles.switchText, { color: theme.primaryLight }]}>{t.haveAccount}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});
