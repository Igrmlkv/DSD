import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
} from '../../database';

const TYPE_CONFIG = {
  info: { icon: 'information-circle', color: COLORS.secondary },
  warning: { icon: 'warning', color: COLORS.accent },
  error: { icon: 'alert-circle', color: COLORS.error },
  success: { icon: 'checkmark-circle', color: '#34C759' },
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch (e) {
      console.error('Notifications load error:', e);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePress = async (item) => {
    if (!item.is_read) {
      await markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => n.id === item.id ? { ...n, is_read: 1 } : n)
      );
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} ${t('notifications.minAgo')}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t('notifications.hoursAgo')}`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.is_read && styles.notifUnread]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.notifIcon, { backgroundColor: cfg.color + '15' }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]}>{item.title}</Text>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>{t('notifications.markAllRead', { count: unreadCount })}</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('notifications.noNotifications')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 32 },
  markAllBtn: { padding: 12, alignItems: 'center', backgroundColor: COLORS.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  markAllText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 14, gap: 12, marginBottom: 8,
  },
  notifUnread: { backgroundColor: COLORS.primary + '08', borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  notifIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  notifTitleUnread: { fontWeight: '700' },
  notifMessage: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3, lineHeight: 18 },
  notifTime: { fontSize: 11, color: COLORS.tabBarInactive, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
