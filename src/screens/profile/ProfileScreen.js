import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import useAuthStore from '../../store/authStore';
import { getUnreadNotificationCount } from '../../database';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (user?.id) {
        const count = await getUnreadNotificationCount(user.id);
        setUnreadCount(count);
      }
    } catch (e) { console.error('Profile load:', e); }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const MenuRow = ({ icon, iconColor, title, subtitle, badge, onPress }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: (iconColor || COLORS.primary) + '15' }]}>
        <Ionicons name={icon} size={20} color={iconColor || COLORS.primary} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={COLORS.tabBarInactive} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
    >
      {/* Профиль */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Ionicons name="person" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.profileName}>{user?.full_name || t('profileScreen.defaultName')}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{t('roles.' + user?.role) || user?.role}</Text>
        </View>
        {user?.phone && (
          <Text style={styles.profilePhone}>
            <Ionicons name="call-outline" size={13} color={COLORS.textSecondary} /> {user.phone}
          </Text>
        )}
        {user?.vehicle_number && (
          <Text style={styles.profileVehicle}>
            <Ionicons name="car-outline" size={13} color={COLORS.textSecondary} /> {user.vehicle_number}
          </Text>
        )}
      </View>

      {/* Меню */}
      <View style={styles.menuSection}>
        <MenuRow
          icon="notifications"
          iconColor={COLORS.accent}
          title={t('profileScreen.notifications')}
          subtitle={t('profileScreen.notificationsSub')}
          badge={unreadCount}
          onPress={() => navigation.navigate(SCREEN_NAMES.NOTIFICATIONS)}
        />
        <View style={styles.separator} />
        <MenuRow
          icon="settings"
          iconColor={COLORS.info}
          title={t('profileScreen.settings')}
          subtitle="PIN, синхронизация, профиль"
          onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
        />
      </View>

      {/* Информация */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Логин</Text>
          <Text style={styles.infoValue}>@{user?.username}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Роль</Text>
          <Text style={styles.infoValue}>{t('roles.' + user?.role) || user?.role}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Статус</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Активен</Text>
          </View>
        </View>
      </View>

      <Text style={styles.version}>DSD Mini v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  roleBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  roleText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  profilePhone: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  profileVehicle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  menuSection: { backgroundColor: COLORS.white, borderRadius: 14, marginTop: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  menuSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { backgroundColor: COLORS.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 66 },
  infoSection: { backgroundColor: COLORS.white, borderRadius: 14, marginTop: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' },
  statusText: { fontSize: 14, fontWeight: '500', color: '#34C759' },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.tabBarInactive, marginTop: 24 },
});
