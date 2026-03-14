import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import { TEST_ACCOUNTS } from '../../services/authService';
import { ROLES } from '../../constants/roles';
import { COLORS } from '../../constants/colors';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const authLogin = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.errorEmpty'));
      return;
    }
    setIsLoading(true);
    try {
      await authLogin(login.trim(), password);
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.' + error.message, { defaultValue: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (username) => {
    setLogin(username);
    setPassword('1');
    setIsLoading(true);
    try {
      await authLogin(username, '1');
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.' + error.message, { defaultValue: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.appName}>DSD Mini</Text>
        <Text style={styles.title}>{t('auth.title')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('auth.login')}
          placeholderTextColor={COLORS.tabBarInactive}
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor={COLORS.tabBarInactive}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>{t('auth.loginButton')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.testAccounts')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.accountsList}>
          {TEST_ACCOUNTS.map((acc) => {
            const roleCfg = ROLES[acc.role];
            return (
              <TouchableOpacity
                key={acc.username}
                style={styles.accountCard}
                onPress={() => quickLogin(acc.username)}
                disabled={isLoading}
              >
                <View style={styles.accountIcon}>
                  <Ionicons name={roleCfg.icon} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{acc.fullName}</Text>
                  <Text style={styles.accountRole}>{roleCfg.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  appName: {
    fontSize: 32, fontWeight: 'bold', textAlign: 'center',
    color: COLORS.accent, marginBottom: 8,
  },
  title: {
    fontSize: 18, textAlign: 'center', color: COLORS.textSecondary, marginBottom: 30,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 12, color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary, padding: 14, borderRadius: 8,
    alignItems: 'center', marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border },
  dividerText: {
    fontSize: 12, color: COLORS.textSecondary, paddingHorizontal: 10,
  },
  accountsList: { gap: 6 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 10, padding: 12, gap: 10,
  },
  accountIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  accountRole: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
});
