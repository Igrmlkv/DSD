import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import {
  getVehicleByDriver, getVehicleStock, getAdjustmentReasons,
  createInventoryAdjustment, verifySupervisorPassword,
} from '../../database';

export default function AdjustInventoryScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const lang = i18n.language;

  const [vehicle, setVehicle] = useState(null);
  const [items, setItems] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [adjustedQty, setAdjustedQty] = useState({});
  const [selectedReasons, setSelectedReasons] = useState({});
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');

  // Auth state
  const [authorized, setAuthorized] = useState(false);
  const [supervisorId, setSupervisorId] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authPassword, setAuthPassword] = useState('');

  // Reason picker
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [reasonPickerTarget, setReasonPickerTarget] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const v = await getVehicleByDriver(user.id);
        if (v) {
          setVehicle(v);
          const stock = await getVehicleStock(v.id);
          setItems(stock);
          const initial = {};
          stock.forEach((s) => { initial[s.id] = s.quantity; });
          setAdjustedQty(initial);
        }
        const r = await getAdjustmentReasons();
        setReasons(r);
      } catch (e) { console.error('AdjustInventory load:', e); }
    })();
  }, [user.id]));

  const handleAuth = async () => {
    try {
      const sv = await verifySupervisorPassword(authPassword);
      if (sv) {
        setAuthorized(true);
        setSupervisorId(sv.id);
        setShowAuthModal(false);
        setAuthPassword('');
      } else {
        Alert.alert(t('common.error'), t('adjustInventory.authFailed'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const updateQty = (id, text) => {
    const val = parseInt(text, 10);
    setAdjustedQty((prev) => ({ ...prev, [id]: isNaN(val) ? 0 : val }));
  };

  const openReasonPicker = (productId) => {
    setReasonPickerTarget(productId);
    setShowReasonPicker(true);
  };

  const selectReason = (reasonId) => {
    setSelectedReasons((prev) => ({ ...prev, [reasonPickerTarget]: reasonId }));
    setShowReasonPicker(false);
    setReasonPickerTarget(null);
  };

  const getReasonName = (reasonId) => {
    const r = reasons.find((r) => r.id === reasonId);
    if (!r) return t('adjustInventory.selectReason');
    return lang === 'ru' ? r.name_ru : r.name_en;
  };

  const changedItems = items.filter((i) => (adjustedQty[i.id] || 0) !== i.quantity);

  const filtered = items.filter((i) =>
    !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    if (changedItems.length === 0) {
      Alert.alert('', t('adjustInventory.noChanges'));
      return;
    }

    const missingReasons = changedItems.filter((i) => !selectedReasons[i.id]);
    if (missingReasons.length > 0) {
      Alert.alert('', t('adjustInventory.selectReason'));
      return;
    }

    Alert.alert(
      t('adjustInventory.confirmTitle'),
      t('adjustInventory.confirmMessage', { count: changedItems.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'), onPress: async () => {
            try {
              const adjItems = changedItems.map((i) => ({
                product_id: i.product_id,
                reason_id: selectedReasons[i.id],
                previous_qty: i.quantity,
                adjusted_qty: adjustedQty[i.id] || 0,
              }));

              await createInventoryAdjustment({
                vehicleId: vehicle?.id,
                warehouse: vehicle?.id || 'main',
                userId: user.id,
                supervisorUserId: supervisorId,
                notes,
                items: adjItems,
              });

              Alert.alert(t('common.done'), t('adjustInventory.saved'));
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Supervisor Auth Modal */}
      <Modal visible={showAuthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.primary} />
              <Text style={styles.modalTitle}>{t('adjustInventory.supervisorAuth')}</Text>
              <Text style={styles.modalSubtitle}>{t('adjustInventory.enterPassword')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('adjustInventory.password')}
                placeholderTextColor={COLORS.tabBarInactive}
                secureTextEntry
                value={authPassword}
                onChangeText={setAuthPassword}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAuthModal(false); navigation.goBack(); }}>
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalAuthBtn} onPress={handleAuth}>
                  <Text style={styles.modalAuthText}>{t('adjustInventory.authorize')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Reason Picker Modal */}
      <Modal visible={showReasonPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reasonPickerContent}>
            <Text style={styles.reasonPickerTitle}>{t('adjustInventory.reason')}</Text>
            {reasons.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.reasonOption}
                onPress={() => selectReason(r.id)}
              >
                <Text style={styles.reasonOptionText}>
                  {lang === 'ru' ? r.name_ru : r.name_en}
                </Text>
                {selectedReasons[reasonPickerTarget] === r.id && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.reasonCancelBtn} onPress={() => setShowReasonPicker(false)}>
              <Text style={styles.reasonCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!authorized ? (
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={COLORS.tabBarInactive} />
          <Text style={styles.lockedText}>{t('adjustInventory.authRequired')}</Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={() => setShowAuthModal(true)}>
            <Text style={styles.unlockBtnText}>{t('adjustInventory.authorize')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {vehicle && (
            <View style={styles.header}>
              <Ionicons name="car" size={20} color={COLORS.primary} />
              <Text style={styles.headerText}>{vehicle.model} • {vehicle.plate_number}</Text>
              <View style={styles.authBadge}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              </View>
            </View>
          )}

          <TextInput
            style={styles.search}
            placeholder={t('adjustInventory.searchPlaceholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            value={search}
            onChangeText={setSearch}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const newQty = adjustedQty[item.id] || 0;
              const isDiff = newQty !== item.quantity;
              const diff = newQty - item.quantity;
              return (
                <View style={[styles.itemRow, isDiff && styles.itemChanged]}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                    <Text style={styles.itemSku}>{item.sku}</Text>
                  </View>

                  <View style={styles.qtySection}>
                    <View style={styles.qtyLabels}>
                      <Text style={styles.qtyLabel}>{t('adjustInventory.currentQty')}</Text>
                      <Text style={styles.qtyOriginal}>{item.quantity}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.textSecondary} />
                    <TextInput
                      style={[styles.qtyInput, isDiff && styles.qtyInputChanged]}
                      value={String(newQty)}
                      onChangeText={(txt) => updateQty(item.id, txt)}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    {isDiff && (
                      <Text style={[styles.diffText, diff > 0 ? styles.diffPositive : styles.diffNegative]}>
                        {diff > 0 ? '+' : ''}{diff}
                      </Text>
                    )}
                  </View>

                  {isDiff && (
                    <TouchableOpacity style={styles.reasonBtn} onPress={() => openReasonPicker(item.id)}>
                      <Ionicons name="document-text-outline" size={14} color={selectedReasons[item.id] ? COLORS.primary : COLORS.error} />
                      <Text style={[styles.reasonBtnText, !selectedReasons[item.id] && styles.reasonRequired]} numberOfLines={1}>
                        {getReasonName(selectedReasons[item.id])}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="clipboard-outline" size={48} color={COLORS.tabBarInactive} />
                <Text style={styles.emptyText}>{t('inventoryScreen.noItems')}</Text>
              </View>
            }
          />

          {items.length > 0 && (
            <View style={styles.footer}>
              <TextInput
                style={styles.notesInput}
                placeholder={t('adjustInventory.notes')}
                placeholderTextColor={COLORS.tabBarInactive}
                value={notes}
                onChangeText={setNotes}
              />
              <View style={styles.footerRow}>
                <Text style={[styles.footerSummary, changedItems.length > 0 && styles.footerSummaryActive]}>
                  {t('adjustInventory.itemsAdjusted', { count: changedItems.length })}
                </Text>
                <TouchableOpacity
                  style={[styles.submitBtn, changedItems.length === 0 && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={changedItems.length === 0}
                >
                  <Text style={styles.submitText}>{t('inventoryScreen.saveButton')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  headerText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  authBadge: { padding: 4 },
  search: { backgroundColor: COLORS.white, margin: 12, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text },
  list: { paddingHorizontal: 12, paddingBottom: 180 },

  // Items
  itemRow: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 6 },
  itemChanged: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  itemInfo: { marginBottom: 8 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  qtySection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyLabels: { alignItems: 'center' },
  qtyLabel: { fontSize: 10, color: COLORS.textSecondary },
  qtyOriginal: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  qtyInput: { width: 60, height: 38, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.text },
  qtyInputChanged: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '10' },
  diffText: { fontSize: 14, fontWeight: '700', minWidth: 36, textAlign: 'center' },
  diffPositive: { color: COLORS.success },
  diffNegative: { color: COLORS.error },

  // Reason button
  reasonBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.background, borderRadius: 8 },
  reasonBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '500', flex: 1 },
  reasonRequired: { color: COLORS.error },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  notesInput: { backgroundColor: COLORS.background, borderRadius: 8, padding: 10, fontSize: 13, color: COLORS.text, marginBottom: 10 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerSummary: { fontSize: 13, color: COLORS.textSecondary },
  footerSummaryActive: { color: COLORS.primary, fontWeight: '600' },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

  // Locked state
  lockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  lockedText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 16, lineHeight: 20 },
  unlockBtn: { marginTop: 20, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  unlockBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

  // Auth Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 28, alignItems: 'center', width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  modalInput: { width: '100%', backgroundColor: COLORS.background, borderRadius: 10, padding: 14, fontSize: 16, marginTop: 20, textAlign: 'center', color: COLORS.text },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  modalAuthBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalAuthText: { fontSize: 15, fontWeight: '600', color: COLORS.white },

  // Reason Picker Modal
  reasonPickerContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, width: '90%', maxWidth: 360 },
  reasonPickerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12, textAlign: 'center' },
  reasonOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  reasonOptionText: { fontSize: 15, color: COLORS.text },
  reasonCancelBtn: { marginTop: 12, padding: 12, alignItems: 'center' },
  reasonCancelText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
