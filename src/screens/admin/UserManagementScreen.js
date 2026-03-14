import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { SCREEN_NAMES } from '../../constants/screens';
import { getAllUsers } from '../../database';

const ROLE_COLORS = { expeditor: COLORS.primary, supervisor: COLORS.info, admin: COLORS.accent };

export default function UserManagementScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (e) { console.error('UserManagement load:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filtered = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const renderUser = ({ item }) => {
    const roleColor = ROLE_COLORS[item.role] || COLORS.textSecondary;
    const isActive = item.is_active !== 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate(SCREEN_NAMES.USER_EDIT, { userId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: roleColor + '20' }]}>
            <Ionicons name="person" size={22} color={roleColor} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.full_name}</Text>
            <Text style={styles.cardLogin}>@{item.username}</Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{t('roles.' + item.role) || item.role}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isActive ? '#34C759' : COLORS.error }]} />
          </View>
        </View>
        {item.phone && (
          <Text style={styles.cardPhone}>
            <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} /> {item.phone}
          </Text>
        )}
        {item.vehicle_number && (
          <Text style={styles.cardVehicle}>
            <Ionicons name="car-outline" size={12} color={COLORS.textSecondary} /> {item.vehicle_number}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Поиск */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('userManagement.searchPlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Счётчик */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>Всего: {filtered.length}</Text>
        <View style={styles.countBadges}>
          {['expeditor', 'supervisor', 'admin'].map((key) => {
            const count = filtered.filter((u) => u.role === key).length;
            return count > 0 ? (
              <View key={key} style={[styles.countBadge, { backgroundColor: (ROLE_COLORS[key] || COLORS.textSecondary) + '15' }]}>
                <Text style={[styles.countBadgeText, { color: ROLE_COLORS[key] }]}>{t('roles.' + key)}: {count}</Text>
              </View>
            ) : null;
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>Пользователи не найдены</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate(SCREEN_NAMES.USER_EDIT, { userId: null })}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, margin: 16, marginBottom: 0, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  countText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  countBadges: { flexDirection: 'row', gap: 6 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  countBadgeText: { fontSize: 11, fontWeight: '500' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 80 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardLogin: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardPhone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, marginLeft: 56 },
  cardVehicle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, marginLeft: 56 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
});
