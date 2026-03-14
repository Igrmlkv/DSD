import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { getDbStats } from '../../database';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';

export default function SystemSettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const logout = useAuthStore((s) => s.logout);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [dbStats, setDbStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Настройки (mock state)
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(15); // минут
  const [returnLimit, setReturnLimit] = useState(50000);

  const loadData = useCallback(async () => {
    try {
      const stats = await getDbStats();
      setDbStats(stats);
    } catch (e) { console.error('SystemSettings load:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleLogout = () => {
    Alert.alert(t('systemSettings.logoutTitle'), t('systemSettings.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('systemSettings.logoutButton'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const formatMoney = (v) => (v || 0).toLocaleString('ru-RU');

  const SettingRow = ({ icon, iconColor, title, subtitle, right, onPress }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: (iconColor || COLORS.primary) + '15' }]}>
        <Ionicons name={icon} size={18} color={iconColor || COLORS.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={18} color={COLORS.tabBarInactive} />)}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
    >
      {/* Синхронизация */}
      <Text style={styles.sectionTitle}>{t('systemSettings.syncSection')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="sync"
          iconColor={COLORS.secondary}
          title={t('systemSettings.autoSync')}
          subtitle={t('systemSettings.autoSyncSub')}
          right={<Switch value={autoSync} onValueChange={setAutoSync} trackColor={{ true: COLORS.primary }} />}
        />
        <View style={styles.separator} />
        <SettingRow
          icon="time"
          iconColor={COLORS.info}
          title={t('systemSettings.syncInterval')}
          subtitle={t('systemSettings.syncIntervalSub', { minutes: syncInterval })}
          onPress={() => {
            const next = syncInterval === 5 ? 15 : syncInterval === 15 ? 30 : syncInterval === 30 ? 60 : 5;
            setSyncInterval(next);
          }}
        />
      </View>

      {/* Лимиты */}
      <Text style={styles.sectionTitle}>{t('systemSettings.limitsSection')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="return-down-back"
          iconColor={COLORS.accent}
          title={t('systemSettings.returnLimit')}
          subtitle={t('systemSettings.returnLimitSub', { amount: formatMoney(returnLimit) })}
          onPress={() => {
            const next = returnLimit === 10000 ? 25000 : returnLimit === 25000 ? 50000 : returnLimit === 50000 ? 100000 : 10000;
            setReturnLimit(next);
          }}
        />
        <View style={styles.separator} />
        <SettingRow
          icon="shield-checkmark"
          iconColor="#34C759"
          title={t('systemSettings.passwordPolicy')}
          subtitle={t('systemSettings.passwordPolicySub')}
        />
      </View>

      {/* Данные */}
      <Text style={styles.sectionTitle}>{t('systemSettings.databaseSection')}</Text>
      <View style={styles.section}>
        {dbStats && Object.entries(dbStats).map(([key, value]) => (
          <View key={key}>
            <SettingRow
              icon="server"
              iconColor={COLORS.textSecondary}
              title={key}
              subtitle={`${value} ${t('common.records')}`}
            />
            <View style={styles.separator} />
          </View>
        ))}
        <SettingRow
          icon="refresh"
          iconColor={COLORS.error}
          title={t('systemSettings.resetDatabase')}
          subtitle={t('systemSettings.resetDatabaseSub')}
          onPress={() => Alert.alert(t('systemSettings.resetDbConfirm'), t('systemSettings.resetDbConfirmMsg'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('systemSettings.resetButton'), style: 'destructive', onPress: () => Alert.alert(t('common.done'), t('systemSettings.resetDone')) },
          ])}
        />
      </View>

      {/* Навигация */}
      <Text style={styles.sectionTitle}>{t('systemSettings.logsSection')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="list"
          iconColor={COLORS.info}
          title={t('systemSettings.auditLog')}
          subtitle={t('systemSettings.auditLogSub')}
          onPress={() => navigation.navigate(SCREEN_NAMES.AUDIT_LOG)}
        />
      </View>

      {/* О системе */}
      <Text style={styles.sectionTitle}>{t('systemSettings.aboutSection')}</Text>
      <View style={styles.section}>
        <SettingRow icon="information-circle" iconColor={COLORS.primary} title={t('systemSettings.appVersion')} subtitle={t('systemSettings.appVersionSub')} />
        <View style={styles.separator} />
        <SettingRow icon="server" iconColor={COLORS.textSecondary} title={t('systemSettings.apiVersion')} subtitle={t('systemSettings.apiVersionSub')} />
      </View>

      {/* Language */}
      <Text style={styles.sectionTitle}>{t('systemSettings.languageSection')}</Text>
      <View style={styles.section}>
        <SettingRow
          icon="language"
          iconColor={COLORS.info}
          title={t('systemSettings.language')}
          subtitle={language === 'ru' ? t('systemSettings.languageRu') : t('systemSettings.languageEn')}
          onPress={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
        />
      </View>

      {/* Выход */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>{t('systemSettings.logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginTop: 16, marginLeft: 4 },
  section: { backgroundColor: COLORS.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  settingSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 62 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginTop: 24, borderWidth: 1, borderColor: COLORS.error + '30' },
  logoutText: { fontSize: 16, fontWeight: '600', color: COLORS.error },
});
