import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import { getRoleConfig } from '../../constants/roles';

const MAP_PROVIDERS = [
  { key: 'yandex', icon: 'map' },
  { key: 'osm', label: 'OpenStreetMap', icon: 'globe-outline' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const roleConfig = getRoleConfig(user?.role);
  const mapProvider = useSettingsStore((s) => s.mapProvider);
  const setMapProvider = useSettingsStore((s) => s.setMapProvider);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const sections = [
    {
      title: t('settingsScreen.profileSection'),
      items: [
        { icon: 'person-outline', label: user?.fullName || '', subtitle: roleConfig?.label },
        { icon: 'call-outline', label: user?.phone || t('settingsScreen.phoneDefault'), subtitle: t('settingsScreen.phoneLabel') },
      ],
    },
    {
      title: t('settingsScreen.appSection'),
      items: [
        { icon: 'key-outline', label: t('settingsScreen.changePin'), onPress: () => Alert.alert('PIN', t('settingsScreen.pinInDev')) },
        { icon: 'notifications-outline', label: t('settingsScreen.notifications'), subtitle: t('settingsScreen.notificationsEnabled') },
        { icon: 'sync-outline', label: t('settingsScreen.sync'), subtitle: t('settingsScreen.syncAuto') },
        { icon: 'language-outline', label: t('systemSettings.language'), subtitle: language === 'ru' ? t('systemSettings.languageRu') : t('systemSettings.languageEn'), onPress: () => setLanguage(language === 'ru' ? 'en' : 'ru') },
      ],
    },
    {
      title: t('settingsScreen.aboutSection'),
      items: [
        { icon: 'information-circle-outline', label: t('settingsScreen.version'), subtitle: t('settingsScreen.versionValue') },
        { icon: 'server-outline', label: t('settingsScreen.server'), subtitle: t('settingsScreen.serverValue') },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.row, idx < section.items.length - 1 && styles.rowBorder]}
                onPress={item.onPress}
                disabled={!item.onPress}
              >
                <Ionicons name={item.icon} size={22} color={COLORS.primary} style={styles.rowIcon} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  {item.subtitle && <Text style={styles.rowSubtitle}>{item.subtitle}</Text>}
                </View>
                {item.onPress && <Ionicons name="chevron-forward" size={18} color={COLORS.border} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Map Provider Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settingsScreen.mapProvider')}</Text>
        <View style={styles.sectionCard}>
          {MAP_PROVIDERS.map((provider, idx) => {
            const isSelected = mapProvider === provider.key;
            return (
              <TouchableOpacity
                key={provider.key}
                style={[styles.row, idx < MAP_PROVIDERS.length - 1 && styles.rowBorder]}
                onPress={() => setMapProvider(provider.key)}
              >
                <Ionicons name={provider.icon} size={22} color={COLORS.primary} style={styles.rowIcon} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{provider.key === 'yandex' ? t('settingsScreen.yandexMaps') : provider.label}</Text>
                  <Text style={styles.rowSubtitle}>
                    {provider.key === 'yandex' ? t('settingsScreen.yandexMapsSub') : t('settingsScreen.osmMapsSub')}
                  </Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  sectionCard: { backgroundColor: COLORS.white, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border + '60' },
  rowIcon: { marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  rowSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: COLORS.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
});
