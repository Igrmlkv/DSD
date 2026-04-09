import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Modal, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';
import { getUnreadNotificationCount, getDatabase, getActiveVehicles, assignVehicleToDriver } from '../../database';
import { performFullSync } from '../../services/syncService';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateVehicle = useAuthStore((s) => s.updateVehicle);
  const serverSyncEnabled = useSettingsStore((s) => s.serverSyncEnabled);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [allVehicles, setAllVehicles] = useState([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [pickerSelectedId, setPickerSelectedId] = useState(null);

  const loadSyncData = useCallback(async () => {
    if (!serverSyncEnabled) return;
    try {
      const database = await getDatabase();
      const pending = await database.getFirstAsync(
        `SELECT COUNT(*) as count FROM sync_log WHERE synced = 0`
      );
      setPendingCount(pending?.count || 0);
      const meta = await database.getFirstAsync(
        `SELECT MAX(last_sync_at) as last_sync_at FROM sync_meta`
      );
      setLastSyncAt(meta?.last_sync_at || null);
    } catch (e) { console.error('Sync data load:', e); }
  }, [serverSyncEnabled]);

  const loadData = useCallback(async () => {
    try {
      if (user?.id) {
        const count = await getUnreadNotificationCount(user.id);
        setUnreadCount(count);
      }
      if (user?.role === 'expeditor' || user?.role === 'preseller') {
        const vehicles = await getActiveVehicles();
        setAllVehicles(vehicles);
      }
      await loadSyncData();
    } catch (e) { console.error('Profile load:', e); }
  }, [user?.id, user?.role, loadSyncData]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const result = await performFullSync();
      if (result?.authExpired) {
        setSyncStatus('error');
        Alert.alert(
          t('common.error'),
          t('syncMonitoring.sessionExpired'),
          [{ text: 'OK', onPress: () => useAuthStore.getState().logout() }]
        );
        return;
      }
      setSyncStatus('success');
      await loadSyncData();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      console.error('Manual sync error:', e);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [loadSyncData, t]);

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return allVehicles;
    const q = vehicleSearch.toLowerCase();
    return allVehicles.filter(
      (v) => v.plate_number?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q)
    );
  }, [allVehicles, vehicleSearch]);

  const openVehiclePicker = useCallback(() => {
    setPickerSelectedId(user?.vehicleId || null);
    setShowVehiclePicker(true);
  }, [user?.vehicleId]);

  const closeVehiclePicker = useCallback(() => {
    setShowVehiclePicker(false);
    setVehicleSearch('');
    setPickerSelectedId(null);
  }, []);

  const confirmVehicleSelection = useCallback(async () => {
    const selectedVehicle = allVehicles.find((v) => v.id === pickerSelectedId);
    setShowVehiclePicker(false);
    setVehicleSearch('');
    setPickerSelectedId(null);
    if (!selectedVehicle || selectedVehicle.id === user?.vehicleId) return;
    try {
      await assignVehicleToDriver(selectedVehicle.id, user.id);
      await updateVehicle(selectedVehicle.id, selectedVehicle.plate_number, selectedVehicle.model);
      const vehicles = await getActiveVehicles();
      setAllVehicles(vehicles);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  }, [allVehicles, pickerSelectedId, user?.id, user?.vehicleId, updateVehicle, t]);

  const formatLastSync = (dateStr) => {
    if (!dateStr) return t('profileScreen.syncNever');
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSyncBadge = () => {
    if (syncStatus === 'syncing') return { color: COLORS.accent, icon: 'sync', text: '...' };
    if (syncStatus === 'error') return { color: COLORS.error, icon: 'alert-circle', text: '!' };
    if (syncStatus === 'success') return { color: COLORS.success, icon: 'checkmark-circle', text: null };
    if (pendingCount > 0) return { color: COLORS.error, icon: 'cloud-upload', text: String(pendingCount) };
    return { color: COLORS.success, icon: 'checkmark-circle', text: null };
  };

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

  const syncBadge = getSyncBadge();

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
        {(user?.role === 'expeditor' || user?.role === 'preseller') && (
          <TouchableOpacity onPress={openVehiclePicker} style={styles.vehicleTouchable}>
            <Text style={styles.profileVehicle}>
              <Ionicons name="car-outline" size={13} color={COLORS.textSecondary} />
              {' '}
              {user?.vehiclePlate
                ? `${user.vehiclePlate} — ${user.vehicleModel || ''}`
                : t('profileScreen.noVehicle')}
            </Text>
            <Text style={styles.tapToChange}>{t('profileScreen.tapToChange')}</Text>
          </TouchableOpacity>
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
          subtitle={t('profileScreen.settingsSub')}
          onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
        />
      </View>

      {/* Синхронизация */}
      {serverSyncEnabled && (
        <View style={styles.syncSection}>
          <View style={styles.syncHeader}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="sync" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('profileScreen.syncSection')}</Text>
              <Text style={styles.menuSubtitle}>
                {t('profileScreen.syncLastSync')}: {formatLastSync(lastSyncAt)}
              </Text>
            </View>
            <View style={[styles.syncStatusBadge, { backgroundColor: syncBadge.color + '15' }]}>
              <Ionicons name={syncBadge.icon} size={14} color={syncBadge.color} />
              {syncBadge.text && (
                <Text style={[styles.syncStatusText, { color: syncBadge.color }]}>{syncBadge.text}</Text>
              )}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.syncPendingRow}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.accent + '15' }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.accent} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{t('profileScreen.syncPending')}</Text>
            </View>
            <Text style={[styles.pendingCountText, pendingCount > 0 && { color: COLORS.error }]}>
              {pendingCount}
            </Text>
          </View>

          <View style={styles.separator} />

          <TouchableOpacity
            style={[styles.syncButton, syncStatus === 'syncing' && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncStatus === 'syncing'}
          >
            {syncStatus === 'syncing' ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="sync" size={18} color={COLORS.white} />
            )}
            <Text style={styles.syncButtonText}>
              {syncStatus === 'syncing' ? t('profileScreen.syncInProgress') : t('profileScreen.syncNow')}
            </Text>
          </TouchableOpacity>

          {syncStatus === 'success' && (
            <Text style={styles.syncResultText}>{t('profileScreen.syncSuccess')}</Text>
          )}
          {syncStatus === 'error' && (
            <Text style={[styles.syncResultText, { color: COLORS.error }]}>{t('profileScreen.syncError')}</Text>
          )}
        </View>
      )}

      {/* Информация */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('profileScreen.login')}</Text>
          <Text style={styles.infoValue}>@{user?.username}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('profileScreen.role')}</Text>
          <Text style={styles.infoValue}>{t('roles.' + user?.role) || user?.role}</Text>
        </View>
        {(user?.role === 'expeditor' || user?.role === 'preseller') && (
          <>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('profileScreen.vehicle')}</Text>
              <Text style={styles.infoValue}>{user?.vehiclePlate || t('profileScreen.noVehicle')}</Text>
            </View>
          </>
        )}
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('profileScreen.status')}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{t('profileScreen.active')}</Text>
          </View>
        </View>
      </View>

      {user?.role !== 'admin' && (
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert(
            t('systemSettings.logoutTitle'),
            t('systemSettings.logoutMsg'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('systemSettings.logoutButton'), style: 'destructive', onPress: () => logout() },
            ]
          )}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>{t('systemSettings.logout')}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.version}>DSD Mini v1.0.0</Text>

      {/* Vehicle picker modal */}
      <Modal visible={showVehiclePicker} animationType="slide" onRequestClose={closeVehiclePicker}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('startOfDay.selectVehicle')}</Text>
            <TouchableOpacity onPress={closeVehiclePicker}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchWrap}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder={t('startOfDay.searchVehicle')}
              placeholderTextColor={COLORS.textSecondary}
              value={vehicleSearch}
              onChangeText={setVehicleSearch}
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filteredVehicles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const isPickerSelected = item.id === pickerSelectedId;
              const isOccupied = item.driver_id && String(item.driver_id) !== String(user?.id);
              const disabled = isOccupied;
              return (
                <TouchableOpacity
                  style={[styles.vehicleRow, isPickerSelected && styles.vehicleRowSelected, disabled && styles.vehicleRowDisabled]}
                  onPress={() => !disabled && setPickerSelectedId(item.id)}
                  disabled={disabled}
                >
                  <View style={styles.vehicleRowInfo}>
                    <Text style={[styles.vehiclePlateText, disabled && styles.vehicleTextDisabled]}>
                      {item.plate_number}
                    </Text>
                    <Text style={[styles.vehicleModelText, disabled && styles.vehicleTextDisabled]}>
                      {item.model || ''}
                      {isOccupied ? ` · ${t('startOfDay.vehicleOccupied', { driver: item.driver_name || '—' })}` : ''}
                    </Text>
                  </View>
                  {isPickerSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                  {isOccupied && !isPickerSelected && (
                    <Ionicons name="lock-closed" size={18} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalBackBtn} onPress={closeVehiclePicker}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              <Text style={styles.modalBackBtnText}>{t('startOfDay.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSelectBtn, !pickerSelectedId && styles.modalSelectBtnDisabled]}
              onPress={confirmVehicleSelection}
              disabled={!pickerSelectedId}
            >
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.modalSelectBtnText}>{t('startOfDay.confirmSelect')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { fontSize: 14, fontWeight: '500', color: COLORS.success },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginTop: 24, borderWidth: 1, borderColor: COLORS.error + '30' },
  logoutText: { fontSize: 16, fontWeight: '600', color: COLORS.error },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.tabBarInactive, marginTop: 24 },
  // Sync section
  syncSection: { backgroundColor: COLORS.white, borderRadius: 14, marginTop: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  syncHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  syncStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  syncStatusText: { fontSize: 11, fontWeight: '600' },
  syncPendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pendingCountText: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginRight: 4 },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, marginHorizontal: 14, marginVertical: 12, paddingVertical: 12 },
  syncButtonDisabled: { opacity: 0.6 },
  syncButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  syncResultText: { textAlign: 'center', fontSize: 13, fontWeight: '500', color: COLORS.success, paddingBottom: 10 },
  // Vehicle
  vehicleTouchable: { alignItems: 'center', marginTop: 4 },
  tapToChange: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  // Vehicle picker modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalSearchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.white, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalSearchInput: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0 },
  vehicleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    backgroundColor: COLORS.white, borderRadius: 12,
  },
  vehicleRowSelected: { borderWidth: 2, borderColor: COLORS.primary },
  vehicleRowDisabled: { opacity: 0.5 },
  vehicleRowInfo: { flex: 1 },
  vehiclePlateText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  vehicleModelText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  vehicleTextDisabled: { color: COLORS.textSecondary },
  modalFooter: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  modalBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  modalBackBtnText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  modalSelectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
  },
  modalSelectBtnDisabled: { opacity: 0.4 },
  modalSelectBtnText: { fontSize: 15, color: COLORS.white, fontWeight: '700' },
});
