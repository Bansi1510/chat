import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { CustomButton } from '../components/CustomButton';
import { CustomInput } from '../components/CustomInput';
import { UserAvatar } from '../components/UserAvatar';
import { Language } from '../localization/i18n';
import { api } from '../services/api';

export const SettingsScreen = ({ navigation }: any) => {
  const { theme, t, user, isDark, toggleTheme, language, setLanguage, logout, setUser } =
    useAppStore();

  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername === user?.username) return;
    try {
      setLoading(true);
      const res = await api.patch('/me/username', { username: newUsername.trim() });
      setUser(res.data.data);
      Alert.alert('Success', 'Username updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Required', 'Please fill in both password fields');
      return;
    }
    try {
      setLoading(true);
      await api.patch('/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.settings}</Text>
      </View>

      <View style={styles.content}>
        {/* User Card */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.profileRow}>
            <UserAvatar name={user?.username || ''} size={64} />
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.profileName, { color: theme.text }]}>@{user?.username}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Role: {user?.role}</Text>
            </View>
          </View>
        </View>

        {/* Change Username */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Username</Text>
          <CustomInput
            value={newUsername}
            onChangeText={setNewUsername}
            placeholder="New username"
            autoCapitalize="none"
          />
          <CustomButton
            title="Update Username"
            onPress={handleUpdateUsername}
            loading={loading}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Change Password */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Password</Text>
          <CustomInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current Password"
            secureTextEntry
          />
          <CustomInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password (min 8 chars)"
            secureTextEntry
          />
          <CustomButton
            title="Update Password"
            onPress={handleUpdatePassword}
            loading={loading}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Theme and Languages */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
          
          <View style={styles.prefRow}>
            <Text style={{ color: theme.text, fontSize: 15 }}>{isDark ? t.darkTheme : t.lightTheme}</Text>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: theme.primary }} />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>{t.languages}</Text>
          <View style={styles.langRow}>
            {(['en', 'gu', 'hi'] as Language[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => setLanguage(lang)}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor: language === lang ? theme.primary : theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: language === lang ? '#FFFFFF' : theme.text, fontWeight: 'bold' }}>
                  {lang === 'en' ? 'English' : lang === 'gu' ? 'ગુજરાતી' : 'हिन्दी'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <CustomButton
          title={t.logout}
          onPress={logout}
          variant="danger"
          style={{ marginVertical: 20 }}
        />
      </View>
    </ScrollView>
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
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
