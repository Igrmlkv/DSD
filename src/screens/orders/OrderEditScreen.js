import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import {
  getAllCustomers, getProductsWithPrices, getOrderById, getOrderItems,
  saveOrderWithItems, getAvailableVehicleStock,
} from '../../database';
import { COLORS } from '../../constants/colors';
import { ORDER_STATUS } from '../../constants/statuses';

function formatMoney(v) {
  return Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' R';
}

export default function OrderEditScreen({ route, navigation }) {
  const { t } = useTranslation();
  const orderId = route.params?.orderId;
  const readOnly = route.params?.readOnly || false;
  const pointId = route.params?.pointId || null;
  const routeId = route.params?.routeId || null;
  const isEdit = !!orderId;
  const user = useAuthStore((state) => state.user);
  const isPreseller = user?.role === 'preseller';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Order state
  const [customerId, setCustomerId] = useState(route.params?.customerId || null);
  const [customerName, setCustomerName] = useState(route.params?.customerName || '');
  const [lines, setLines] = useState([]); // { product_id, name, sku, volume, price, quantity, total }
  const [notes, setNotes] = useState('');

  // Stock map: product_id -> available quantity
  const [stockMap, setStockMap] = useState({});

  // Pickers
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedPickerIds, setSelectedPickerIds] = useState(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [custs, prods] = await Promise.all([getAllCustomers(), getProductsWithPrices()]);
      setCustomers(custs);
      setProducts(prods);

      // Load available vehicle stock (stock minus unshipped orders)
      if (user?.vehicleId && !isPreseller) {
        const stock = await getAvailableVehicleStock(user.vehicleId, user.id, orderId || null);
        const map = {};
        for (const s of stock) {
          map[s.product_id] = s.available_quantity;
        }
        setStockMap(map);
      }

      if (isEdit) {
        const order = await getOrderById(orderId);
        const items = await getOrderItems(orderId);
        setCustomerId(order.customer_id);
        setCustomerName(order.customer_name);
        setNotes(order.notes || '');
        setLines(items.map((i) => ({
          product_id: i.product_id,
          name: i.product_name,
          sku: i.sku,
          volume: i.volume,
          price: i.price,
          quantity: i.quantity,
          discount_percent: i.discount_percent || 0,
          total: i.total,
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function selectCustomer(c) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setShowCustomerPicker(false);
    setCustomerSearch('');
  }

  function togglePickerItem(p) {
    setSelectedPickerIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
      return next;
    });
  }

  function addSelectedProducts() {
    const existing = new Set(lines.map((l) => l.product_id));
    const toAdd = products.filter((p) => selectedPickerIds.has(p.id) && !existing.has(p.id));
    const newLines = toAdd.map((p) => {
      const available = stockMap[p.id] || 0;
      const price = p.base_price || 0;
      return {
        product_id: p.id, name: p.name, sku: p.sku, volume: p.volume,
        price, quantity: 1, discount_percent: 0, total: price, maxStock: isPreseller ? null : available,
      };
    });
    setLines((prev) => [...prev, ...newLines]);
    setSelectedPickerIds(new Set());
    setShowProductPicker(false);
    setProductSearch('');
  }

  function addProduct(p) {
    if (lines.find((l) => l.product_id === p.id)) {
      Alert.alert('', t('orderEdit.alreadyAdded'));
      return;
    }
    const available = stockMap[p.id] || 0;
    if (!isPreseller && user?.vehicleId && available <= 0) {
      Alert.alert(t('orderEdit.noStockTitle'), t('orderEdit.noStock', { name: p.name }));
      return;
    }
    const price = p.base_price || 0;
    setLines((prev) => [...prev, {
      product_id: p.id, name: p.name, sku: p.sku, volume: p.volume,
      price, quantity: 1, discount_percent: 0, total: price, maxStock: isPreseller ? null : available,
    }]);
    setShowProductPicker(false);
    setProductSearch('');
  }

  function updateLineQty(idx, text) {
    let qty = parseInt(text, 10) || 0;
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const maxQty = l.maxStock != null ? l.maxStock : (stockMap[l.product_id] ?? Infinity);
      if (qty > maxQty) {
        Alert.alert(t('orderEdit.stockExceeded'), t('orderEdit.available', { qty: maxQty }));
        qty = maxQty;
      }
      const total = qty * l.price * (1 - (l.discount_percent || 0) / 100);
      return { ...l, quantity: qty, total: Math.round(total * 100) / 100 };
    }));
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalAmount = lines.reduce((s, l) => s + l.total, 0);

  async function handleSave() {
    if (!customerId) {
      Alert.alert('', t('orderEdit.selectCustomer'));
      return;
    }
    if (lines.length === 0) {
      Alert.alert('', t('orderEdit.addProduct'));
      return;
    }
    if (lines.some((l) => l.quantity <= 0)) {
      Alert.alert('', t('orderEdit.qtyMustBePositive'));
      return;
    }

    setSaving(true);
    try {
      const orderData = isEdit
        ? { id: orderId, customer_id: customerId, total_amount: totalAmount, discount_amount: 0, notes, status: ORDER_STATUS.DRAFT }
        : { customer_id: customerId, user_id: user.id, route_point_id: pointId, total_amount: totalAmount, notes };
      const itemsData = lines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        price: l.price,
        discount_percent: l.discount_percent || 0,
        total: l.total,
      }));
      await saveOrderWithItems(orderData, itemsData, isEdit);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Picker modals ---
  function renderCustomerPicker() {
    const filtered = customerSearch
      ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.city?.toLowerCase().includes(customerSearch.toLowerCase()))
      : customers;
    return (
      <Modal visible={showCustomerPicker} animationType="slide" onRequestClose={() => setShowCustomerPicker(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('orderEdit.selectClient')}</Text>
            <TouchableOpacity onPress={() => { setShowCustomerPicker(false); setCustomerSearch(''); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder={t('orderEdit.customerPlaceholder')}
              placeholderTextColor={COLORS.tabBarInactive}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerRow} onPress={() => selectCustomer(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  <Text style={styles.pickerSub}>{item.city} | {item.address}</Text>
                </View>
                {item.id === customerId && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    );
  }

  function renderProductPicker() {
    const existing = new Set(lines.map((l) => l.product_id));
    const filtered = products.filter((p) => {
      if (existing.has(p.id)) return false;
      if (!productSearch) return true;
      const q = productSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q);
    });
    const selCount = selectedPickerIds.size;
    return (
      <Modal visible={showProductPicker} animationType="slide" onRequestClose={() => { setShowProductPicker(false); setSelectedPickerIds(new Set()); }}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('orderEdit.addProductTitle')}{selCount > 0 ? ` (${selCount})` : ''}
            </Text>
            <TouchableOpacity onPress={() => { setShowProductPicker(false); setProductSearch(''); setSelectedPickerIds(new Set()); }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder={t('orderEdit.productPlaceholder')}
              placeholderTextColor={COLORS.tabBarInactive}
              value={productSearch}
              onChangeText={setProductSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const available = stockMap[item.id] || 0;
              const noStock = !isPreseller && user?.vehicleId && available <= 0;
              const selected = selectedPickerIds.has(item.id);
              return (
                <TouchableOpacity
                  style={[styles.pickerRow, noStock && styles.pickerRowDisabled, selected && styles.pickerRowSelected]}
                  onPress={() => noStock ? null : togglePickerItem(item)}
                  disabled={noStock}
                >
                  <View style={[styles.pickerCheckbox, selected && styles.pickerCheckboxActive]}>
                    {selected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerName, noStock && styles.pickerNameDisabled]}>{item.name}</Text>
                    <Text style={styles.pickerSub}>{item.sku} | {item.brand} | {item.volume}</Text>
                    {!isPreseller && user?.vehicleId && (
                      <Text style={[styles.pickerStock, noStock && styles.pickerStockEmpty]}>
                        {t('orderEdit.inVehicle')}: {available} {t('orderEdit.pcs')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.pickerRight}>
                    <Text style={styles.pickerPrice}>{formatMoney(item.base_price)}</Text>
                    {noStock && <Text style={styles.pickerNoStock}>{t('orderEdit.noStockLabel')}</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          {selCount > 0 && (
            <View style={styles.pickerFooter}>
              <TouchableOpacity style={styles.pickerConfirmBtn} onPress={addSelectedProducts}>
                <Ionicons name="cart-outline" size={20} color={COLORS.white} />
                <Text style={styles.pickerConfirmText}>
                  {t('orderEdit.addSelected', { count: selCount })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {renderCustomerPicker()}
      {renderProductPicker()}

      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Read-only banner */}
        {readOnly && (
          <View style={styles.readOnlyBanner}>
            <Ionicons name="lock-closed" size={16} color={COLORS.white} />
            <Text style={styles.readOnlyText}>{t('orderEdit.readOnlyHint')}</Text>
          </View>
        )}

        {/* Клиент */}
        <Text style={styles.sectionLabel}>{t('orderEdit.clientLabel')}</Text>
        <TouchableOpacity style={styles.selector} onPress={() => !readOnly && setShowCustomerPicker(true)} disabled={readOnly}>
          <Ionicons name="people-outline" size={20} color={customerId ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.selectorText, !customerId && { color: COLORS.tabBarInactive }]}>
            {customerName || t('orderEdit.selectCustomerHint')}
          </Text>
          {!readOnly && <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />}
        </TouchableOpacity>

        {/* Товары */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>{t('orderEdit.products')} ({lines.length})</Text>
          {!readOnly && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowProductPicker(true)}>
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.addBtnText}>{t('orderEdit.add')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {lines.length === 0 ? (
          <View style={styles.emptyLines}>
            <Ionicons name="cube-outline" size={32} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyLinesText}>{t('orderEdit.noProducts')}</Text>
          </View>
        ) : (
          lines.map((line, idx) => (
            <View key={line.product_id} style={styles.lineCard}>
              <View style={styles.lineTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
                  <Text style={styles.lineMeta}>
                    {line.sku} | {line.volume} | {formatMoney(line.price)}/{line.unit || 'шт'}
                    {line.maxStock != null && !readOnly ? `  •  ${t('orderEdit.inVehicle')}: ${line.maxStock}` : ''}
                  </Text>
                </View>
                {!readOnly && (
                  <TouchableOpacity onPress={() => removeLine(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={22} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.lineBottom}>
                {readOnly ? (
                  <Text style={styles.qtyReadOnly}>{line.quantity} {line.unit || 'шт'}</Text>
                ) : (
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateLineQty(idx, String(Math.max(1, line.quantity - 1)))}
                    >
                      <Ionicons name="remove" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.qtyInput}
                      value={String(line.quantity)}
                      onChangeText={(t) => updateLineQty(idx, t)}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => {
                        const maxQty = line.maxStock != null ? line.maxStock : (stockMap[line.product_id] ?? Infinity);
                        if (line.quantity >= maxQty) {
                          Alert.alert(t('orderEdit.stockExceeded'), t('orderEdit.available', { qty: maxQty }));
                          return;
                        }
                        updateLineQty(idx, String(line.quantity + 1));
                      }}
                    >
                      <Ionicons name="add" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.lineTotal}>{formatMoney(line.total)}</Text>
              </View>
            </View>
          ))
        )}

        {/* Примечание */}
        <Text style={styles.sectionLabel}>{t('orderEdit.note')}</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('orderEdit.commentPlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          multiline
          editable={!readOnly}
        />

        {/* Итого */}
        {lines.length > 0 && (
          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>{t('orderEdit.total')}</Text>
            <Text style={styles.totalValue}>{formatMoney(totalAmount)}</Text>
          </View>
        )}

        {/* Сохранить */}
        {!readOnly && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>{isEdit ? t('orderEdit.saveChanges') : t('orderEdit.createOrder')}</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.textSecondary, borderRadius: 10, padding: 10, marginBottom: 8,
  },
  readOnlyText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  qtyReadOnly: { fontSize: 15, fontWeight: '600', color: COLORS.text },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 6 },

  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 10, padding: 14,
  },
  selectorText: { flex: 1, fontSize: 15, color: COLORS.text },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  emptyLines: { alignItems: 'center', paddingVertical: 24 },
  emptyLinesText: { fontSize: 14, color: COLORS.tabBarInactive, marginTop: 6 },

  lineCard: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 8 },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  lineName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  lineMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  lineBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  qtyInput: {
    width: 56, height: 32, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    textAlign: 'center', fontSize: 15, fontWeight: '600', color: COLORS.text,
  },
  lineTotal: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  notesInput: {
    backgroundColor: COLORS.white, borderRadius: 10, padding: 12, fontSize: 14,
    color: COLORS.text, minHeight: 60, textAlignVertical: 'top',
  },

  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 10, padding: 16, marginTop: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },

  // Modal styles
  modal: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.white, marginHorizontal: 16, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 2 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  pickerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  pickerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pickerRowDisabled: { opacity: 0.45 },
  pickerNameDisabled: { color: COLORS.textSecondary },
  pickerStock: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '500' },
  pickerStockEmpty: { color: COLORS.error },
  pickerRight: { alignItems: 'flex-end', marginLeft: 8 },
  pickerPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  pickerNoStock: { fontSize: 10, color: COLORS.error, fontWeight: '600', marginTop: 2 },
  pickerRowSelected: { backgroundColor: `${COLORS.primary}12` },
  pickerCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  pickerCheckboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pickerFooter: {
    padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border, backgroundColor: COLORS.white,
  },
  pickerConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12,
  },
  pickerConfirmText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginLeft: 16 },
});
