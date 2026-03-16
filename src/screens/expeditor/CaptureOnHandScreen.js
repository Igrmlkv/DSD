import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import useAuthStore from '../../store/authStore';
import {
  getAllProducts, getAllCustomers, createOnHandInventory,
} from '../../database';

export default function CaptureOnHandScreen({ route }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const { customerId, customerName, routePointId } = route.params || {};

  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(
    customerId ? { id: customerId, name: customerName } : null
  );
  const [showCustomerPicker, setShowCustomerPicker] = useState(!customerId);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const prods = await getAllProducts();
        setProducts(prods);
        if (!customerId) {
          const custs = await getAllCustomers();
          setCustomers(custs);
        }
      } catch (e) { console.error('CaptureOnHand load:', e); }
    })();
  }, []));

  const updateQty = (productId, text) => {
    const val = parseInt(text, 10);
    if (isNaN(val) || val === 0) {
      setQuantities((prev) => {
        const next = { ...prev };
        if (text === '' || val === 0) next[productId] = text === '' ? '' : 0;
        else delete next[productId];
        return next;
      });
    } else {
      setQuantities((prev) => ({ ...prev, [productId]: val }));
    }
  };

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const filledItems = Object.entries(quantities).filter(([, q]) => q > 0);

  const handleSave = () => {
    if (filledItems.length === 0) {
      Alert.alert('', t('captureOnHand.noProducts'));
      return;
    }
    if (!selectedCustomer) {
      Alert.alert('', t('captureOnHand.selectCustomer'));
      return;
    }

    Alert.alert(
      t('captureOnHand.confirmSave'),
      t('captureOnHand.confirmSaveMsg', { count: filledItems.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'), onPress: async () => {
            try {
              const items = filledItems.map(([productId, quantity]) => ({
                product_id: productId,
                quantity,
              }));

              await createOnHandInventory({
                customerId: selectedCustomer.id,
                routePointId: routePointId || null,
                userId: user.id,
                notes: null,
                items,
              });

              Alert.alert(t('common.done'), t('captureOnHand.saved'));
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  const handleDiscard = () => {
    if (filledItems.length === 0) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      t('captureOnHand.confirmDiscard'),
      t('captureOnHand.confirmDiscardMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('captureOnHand.discard'), style: 'destructive', onPress: () => {
            setQuantities({});
            Alert.alert('', t('captureOnHand.discarded'));
            navigation.goBack();
          },
        },
      ]
    );
  };

  const selectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setShowCustomerPicker(false);
  };

  if (showCustomerPicker) {
    return (
      <View style={styles.container}>
        <Text style={styles.pickerTitle}>{t('captureOnHand.selectCustomer')}</Text>
        <TextInput
          style={styles.search}
          placeholder={t('captureOnHand.searchPlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          value={search}
          onChangeText={setSearch}
        />
        <FlatList
          data={customers.filter((c) =>
            !search || c.name.toLowerCase().includes(search.toLowerCase())
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.customerRow} onPress={() => selectCustomer(item)}>
              <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerAddress} numberOfLines={1}>{item.address}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.tabBarInactive} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('captureOnHand.noProducts')}</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Customer header */}
      <View style={styles.customerHeader}>
        <Ionicons name="business" size={18} color={COLORS.primary} />
        <Text style={styles.customerHeaderName}>{selectedCustomer?.name}</Text>
      </View>

      <Text style={styles.subtitle}>{t('captureOnHand.subtitle')}</Text>

      <TextInput
        style={styles.search}
        placeholder={t('captureOnHand.searchPlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const qty = quantities[item.id];
          const hasValue = qty !== undefined && qty !== '' && qty > 0;
          return (
            <View style={[styles.itemRow, hasValue && styles.itemFilled]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemSku}>{item.sku} {item.volume ? `• ${item.volume}` : ''}</Text>
              </View>
              <View style={styles.qtyGroup}>
                <Text style={styles.qtyLabel}>{t('captureOnHand.shelfQty')}</Text>
                <TextInput
                  style={[styles.qtyInput, hasValue && styles.qtyInputFilled]}
                  value={qty !== undefined ? String(qty) : ''}
                  onChangeText={(txt) => updateQty(item.id, txt)}
                  keyboardType="numeric"
                  selectTextOnFocus
                  placeholder="0"
                  placeholderTextColor={COLORS.tabBarInactive}
                />
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('captureOnHand.noProducts')}</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerCount}>
            {t('inventoryScreen.itemsCount', { count: filledItems.length })}
          </Text>
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
            <Text style={styles.discardText}>{t('captureOnHand.discard')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, filledItems.length === 0 && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={filledItems.length === 0}
          >
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
            <Text style={styles.saveText}>{t('captureOnHand.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Customer picker
  pickerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, padding: 16, paddingBottom: 0 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 10, padding: 14, marginBottom: 4 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  customerAddress: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Header
  customerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  customerHeaderName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, paddingHorizontal: 14, paddingTop: 8 },

  search: { backgroundColor: COLORS.white, margin: 12, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text },
  list: { paddingHorizontal: 12, paddingBottom: 160 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 12, gap: 10, marginBottom: 4 },
  itemFilled: { borderLeftWidth: 3, borderLeftColor: COLORS.success },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  qtyGroup: { alignItems: 'center' },
  qtyLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 },
  qtyInput: { width: 60, height: 38, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.text },
  qtyInputFilled: { borderColor: COLORS.success, backgroundColor: COLORS.success + '10' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerRow: { marginBottom: 10 },
  footerCount: { fontSize: 13, color: COLORS.textSecondary },
  footerButtons: { flexDirection: 'row', gap: 10 },
  discardBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  discardText: { fontSize: 15, fontWeight: '600', color: COLORS.error },
  saveBtn: { flex: 2, flexDirection: 'row', gap: 6, borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontSize: 15, fontWeight: '600', color: COLORS.white },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
