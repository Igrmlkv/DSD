import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getReturnsPendingApproval, getReturnItems, approveReturn, rejectReturn } from '../../database';

export default function ReturnApprovalScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [returns, setReturns] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [itemsMap, setItemsMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getReturnsPendingApproval();
      setReturns(data);
    } catch (e) { console.error('ReturnApproval load:', e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const toggleExpand = async (returnId) => {
    if (expandedId === returnId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(returnId);
    if (!itemsMap[returnId]) {
      const items = await getReturnItems(returnId);
      setItemsMap((prev) => ({ ...prev, [returnId]: items }));
    }
  };

  const handleApprove = (ret) => {
    Alert.alert(t('returnApproval.approveReturn'), `${ret.customer_name} — ${ret.total_amount?.toLocaleString()} ₽`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('returnApproval.approve'), onPress: async () => {
          await approveReturn(ret.id, user.id);
          await loadData();
        },
      },
    ]);
  };

  const handleReject = (ret) => {
    Alert.prompt ? Alert.prompt(t('returnApproval.rejectReason'), '', async (reason) => {
      await rejectReturn(ret.id, user.id, reason || t('returnApproval.noReason'));
      await loadData();
    }) : Alert.alert(t('returnApproval.rejectReturn'), `${ret.customer_name}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('returnApproval.reject'), style: 'destructive', onPress: async () => {
          await rejectReturn(ret.id, user.id, t('returnApproval.rejectedBySupervisor'));
          await loadData();
        },
      },
    ]);
  };

  const reasonLabels = { quality: t('returnsScreen.reasons.quality'), expired: t('returnsScreen.reasons.expired'), unsold: t('returnsScreen.reasons.unsold'), damaged: t('returnsScreen.reasons.damaged'), other: t('returnsScreen.reasons.other') };

  const renderReturn = ({ item }) => {
    const isExpanded = expandedId === item.id;
    const items = itemsMap[item.id] || [];

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardCustomer}>{item.customer_name}</Text>
            <Text style={styles.cardMeta}>
              {item.driver_name} • {reasonLabels[item.reason] || item.reason}
            </Text>
            <Text style={styles.cardDate}>
              {new Date(item.return_date).toLocaleDateString('ru-RU')}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardAmount}>{item.total_amount?.toLocaleString()} ₽</Text>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {items.map((ri) => (
              <View key={ri.id} style={styles.returnItemRow}>
                <Text style={styles.riName} numberOfLines={1}>{ri.product_name}</Text>
                <Text style={styles.riQty}>{ri.quantity} × {ri.price} ₽</Text>
                <Text style={styles.riTotal}>{ri.total?.toLocaleString()} ₽</Text>
              </View>
            ))}
            {items.length > 0 && items[0].reason && (
              <Text style={styles.riReason}>{items[0].reason}</Text>
            )}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
                <Text style={styles.rejectText}>{t('returnApproval.reject')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.approveText}>{t('returnApproval.approve')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      data={returns}
      keyExtractor={(item) => item.id}
      renderItem={renderReturn}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} colors={[COLORS.primary]} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#34C759" />
          <Text style={styles.emptyText}>Нет возвратов на утверждении</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', padding: 14 },
  cardInfo: { flex: 1 },
  cardCustomer: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  cardDate: { fontSize: 11, color: COLORS.tabBarInactive, marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: { fontSize: 17, fontWeight: '700', color: COLORS.error },
  expandedContent: { padding: 14, paddingTop: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  returnItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  riName: { flex: 1, fontSize: 13, color: COLORS.text },
  riQty: { fontSize: 12, color: COLORS.textSecondary, marginHorizontal: 8 },
  riTotal: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  riReason: { fontSize: 12, color: COLORS.info, fontStyle: 'italic', marginTop: 6, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.error, borderRadius: 10, padding: 10 },
  rejectText: { fontSize: 14, fontWeight: '600', color: COLORS.error },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#34C759', borderRadius: 10, padding: 10 },
  approveText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
