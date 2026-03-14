import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import { getProductsWithPrices, createReturn, increaseStock } from '../../database';

export default function ReturnsScreen({ route }) {
  const { t } = useTranslation();
  const { pointId, customerId, customerName, readOnly } = route.params || {};

  const REASONS = [
    { key: 'quality', label: t('returnsScreen.reasons.quality') },
    { key: 'expired', label: t('returnsScreen.reasons.expired') },
    { key: 'unsold', label: t('returnsScreen.reasons.unsold') },
    { key: 'damaged', label: t('returnsScreen.reasons.damaged') },
    { key: 'other', label: t('returnsScreen.reasons.other') },
  ];
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState('quality');
  const [showPicker, setShowPicker] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [notes, setNotes] = useState('');

  const openPicker = async () => {
    const prods = await getProductsWithPrices();
    setProducts(prods);
    setSearchText('');
    setShowPicker(true);
  };

  const addProduct = (product) => {
    if (items.find((i) => i.product_id === product.id)) {
      Alert.alert('', t('returnsScreen.alreadyAdded'));
      return;
    }
    setItems((prev) => [...prev, {
      product_id: product.id, product_name: product.name, sku: product.sku,
      volume: product.volume, price: product.base_price || 0, quantity: 1,
    }]);
    setShowPicker(false);
  };

  const adjustQty = (idx, delta) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: Math.max(1, updated[idx].quantity + delta) };
      return updated;
    });
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = () => {
    if (items.length === 0) {
      Alert.alert('', t('returnsScreen.addAtLeastOne'));
      return;
    }
    Alert.alert(t('returnsScreen.createReturn'), t('returnsScreen.itemsTotal', { count: items.length, total: total.toLocaleString() }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('returnsScreen.createButton'), onPress: async () => {
          try {
            await createReturn({
              customer_id: customerId, driver_id: user.id,
              route_point_id: pointId, reason, total_amount: total, notes,
            });
            // Increase vehicle stock with returned items
            if (user?.vehicleId && items.length > 0) {
              const stockItems = items
                .filter((i) => i.quantity > 0)
                .map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
              if (stockItems.length > 0) {
                await increaseStock(user.vehicleId, stockItems);
              }
            }
            Alert.alert(t('common.success'), t('returnsScreen.sentForApproval'));
            navigation.goBack();
          } catch (e) {
            Alert.alert(t('common.error'), e.message);
          }
        },
      },
    ]);
  };

  const filteredProducts = products.filter((p) =>
    !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={16} color={COLORS.white} />
          <Text style={styles.readOnlyText}>{t('shipmentScreen.processedViewOnly')}</Text>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(_, idx) => String(idx)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.customer}>{customerName}</Text>
            {/* Причина */}
            <Text style={styles.label}>{t('returnsScreen.reasonLabel')}</Text>
            <View style={styles.reasonRow}>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.reasonChip, reason === r.key && styles.reasonActive]}
                  onPress={() => !readOnly && setReason(r.key)}
                  disabled={readOnly}
                >
                  <Text style={[styles.reasonText, reason === r.key && styles.reasonTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('returnsScreen.products')}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
              <Text style={styles.itemSku}>{item.sku} • {item.price} ₽</Text>
            </View>
            {readOnly ? (
              <Text style={styles.qtyValue}>{item.quantity}</Text>
            ) : (
              <>
                <View style={styles.qtyControl}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(index, -1)}>
                    <Ionicons name="remove" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQty(index, 1)}>
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        ListFooterComponent={
          readOnly ? null : (
            <View>
              <TouchableOpacity style={styles.addBtn} onPress={openPicker}>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
                <Text style={styles.addBtnText}>{t('returnsScreen.addProduct')}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.notesInput}
                placeholder={t('returnsScreen.commentPlaceholder')}
                placeholderTextColor={COLORS.tabBarInactive}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          )
        }
      />

      <View style={styles.footer}>
        <Text style={styles.totalText}>{t('returnsScreen.totalLabel', { total: total.toLocaleString() })}</Text>
        {!readOnly && (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>{t('returnsScreen.submitForApproval')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Product Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('returnsScreen.selectProduct')}</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder={t('returnsScreen.searchPlaceholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            value={searchText}
            onChangeText={setSearchText}
          />
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.prodRow} onPress={() => addProduct(item)}>
                <View>
                  <Text style={styles.prodName}>{item.name}</Text>
                  <Text style={styles.prodSku}>{item.sku} • {item.base_price} ₽</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, padding: 10,
  },
  readOnlyText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 120 },
  customer: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 12 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  reasonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  reasonText: { fontSize: 13, color: COLORS.text },
  reasonTextActive: { color: COLORS.white, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12, gap: 8, marginBottom: 6,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary + '12', justifyContent: 'center', alignItems: 'center' },
  qtyValue: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', marginTop: 8 },
  addBtnText: { fontSize: 15, color: COLORS.primary, fontWeight: '500' },
  notesInput: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginTop: 12, fontSize: 14, color: COLORS.text, minHeight: 60, textAlignVertical: 'top' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalText: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, textAlign: 'center' },
  submitBtn: { backgroundColor: COLORS.error, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: COLORS.background, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchInput: { backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 8, color: COLORS.text },
  prodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 4, borderRadius: 8 },
  prodName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  prodSku: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
