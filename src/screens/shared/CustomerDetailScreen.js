import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { DELIVERY_STATUS } from '../../constants/statuses';
import { DEFAULT_VAT_PERCENT } from '../../constants/config';
import { getCustomerById, getOrdersByCustomer, getPayments } from '../../database';
import AppMapView from '../../components/AppMapView';

const TABS = ['general', 'sales', 'credit'];

export default function CustomerDetailScreen({ route }) {
  const { t } = useTranslation();
  const { customerId } = route.params || {};
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      const c = await getCustomerById(customerId);
      setCustomer(c);
      const ord = await getOrdersByCustomer(customerId);
      setOrders(ord);
      try {
        const pay = await getPayments(null);
        setPayments(pay.filter((p) => p.customer_id === customerId));
      } catch { /* payments may fail */ }
    } catch (e) {
      console.error('CustomerDetail load:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={COLORS.tabBarInactive} />
        <Text style={styles.emptyText}>{t('common.noData')}</Text>
      </View>
    );
  }

  const creditUsed = customer.credit_limit > 0 ? Math.min(100, Math.round((customer.debt_amount / customer.credit_limit) * 100)) : 0;
  const availableCredit = Math.max(0, (customer.credit_limit || 0) - (customer.debt_amount || 0));
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalOrdered = orders.reduce((s, o) => s + (o.total_amount || 0), 0);

  const renderGeneral = () => (
    <View style={styles.tabContent}>
      {/* Name & Legal */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>{t('customerDetail.companyInfo')}</Text>
        <InfoRow icon="business-outline" label={t('customerDetail.clientName')} value={customer.name} />
        {customer.ship_to_name && <InfoRow icon="storefront-outline" label={t('customerDetail.shipToName')} value={customer.ship_to_name} />}
        {customer.legal_name && <InfoRow icon="document-outline" label={t('customerDetail.legalName')} value={customer.legal_name} />}
        {customer.inn && <InfoRow icon="card-outline" label={t('customerDetail.inn')} value={customer.inn} />}
        {customer.kpp && <InfoRow icon="card-outline" label={t('customerDetail.kpp')} value={customer.kpp} />}
      </View>

      {/* Contact */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>{t('customerDetail.contact')}</Text>
        {customer.contact_person && <InfoRow icon="person-outline" label={t('customerDetail.contactPerson')} value={customer.contact_person} />}
        {customer.phone && <InfoRow icon="call-outline" label={t('customerDetail.phone')} value={customer.phone} />}
        {customer.email && <InfoRow icon="mail-outline" label={t('customerDetail.email')} value={customer.email} />}
        {(customer.visit_time_from || customer.visit_time_to) && (
          <InfoRow
            icon="time-outline"
            label={t('customerDetail.visitTime')}
            value={`${customer.visit_time_from || '—'} — ${customer.visit_time_to || '—'}`}
          />
        )}
        {customer.delivery_notes_text && (
          <InfoRow icon="information-circle-outline" label={t('customerDetail.additionalInfo')} value={customer.delivery_notes_text} />
        )}
      </View>

      {/* Address */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>{t('customerDetail.address')}</Text>
        <InfoRow icon="location-outline" label={t('customerDetail.fullAddress')} value={customer.address} />
        {customer.city && <InfoRow icon="business-outline" label={t('customerDetail.city')} value={customer.city} />}
        {customer.region && <InfoRow icon="map-outline" label={t('customerDetail.region')} value={customer.region} />}
        {customer.postal_code && <InfoRow icon="mail-outline" label={t('customerDetail.postalCode')} value={customer.postal_code} />}
        {(customer.latitude && customer.longitude) && (
          <InfoRow icon="navigate-outline" label={t('customerDetail.coordinates')} value={`${customer.latitude}, ${customer.longitude}`} />
        )}
      </View>

      {/* Map */}
      {(customer.latitude && customer.longitude) && (
        <View style={styles.mapCard}>
          <Text style={styles.cardTitle}>{t('customerDetail.locationMap')}</Text>
          <View style={styles.mapContainer}>
            <AppMapView
              style={styles.map}
              initialRegion={{ lat: customer.latitude, lon: customer.longitude, zoom: 15 }}
              markers={[{
                id: 'customer',
                lat: customer.latitude,
                lon: customer.longitude,
                color: COLORS.primary,
              }]}
            />
          </View>
        </View>
      )}
    </View>
  );

  const renderSales = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>{t('customerDetail.salesInfo')}</Text>
        <InfoRow icon="wallet-outline" label={t('customerDetail.paymentTerms')} value={t(`customerDetail.paymentTermsValues.${customer.payment_terms || 'cash'}`)} />
        <InfoRow icon="pricetag-outline" label={t('customerDetail.customerType')} value={customer.customer_type ? t(`customerDetail.customerTypeValues.${customer.customer_type}`) : '—'} />
        <InfoRow icon="receipt-outline" label={t('customerDetail.vatRate')} value={`${customer.vat_rate ?? DEFAULT_VAT_PERCENT}%`} />
      </View>

      {/* Orders summary */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>{t('customerDetail.ordersSummary')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>{t('customerDetail.totalOrders')}</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{totalOrdered.toLocaleString()} ₽</Text>
            <Text style={styles.statLabel}>{t('customerDetail.ordersAmount')}</Text>
          </View>
        </View>
      </View>

      {/* Recent orders */}
      {orders.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t('customerDetail.recentOrders')}</Text>
          {orders.slice(0, 5).map((o) => (
            <View key={o.id} style={styles.orderRow}>
              <View>
                <Text style={styles.orderNum}>#{o.id.slice(-6)}</Text>
                <Text style={styles.orderDate}>{o.order_date?.split('T')[0]}</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderAmount}>{(o.total_amount || 0).toLocaleString()} ₽</Text>
                <Text style={[styles.orderStatus, o.status === DELIVERY_STATUS.DELIVERED && { color: COLORS.success }]}>{o.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderCredit = () => (
    <View style={styles.tabContent}>
      {/* Credit overview */}
      <View style={styles.creditCard}>
        <View style={styles.creditHeader}>
          <Ionicons name="shield-checkmark-outline" size={28} color={creditUsed > 80 ? COLORS.error : COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.creditTitle}>{t('customerDetail.creditInfo')}</Text>
            <Text style={styles.creditSubtitle}>
              {creditUsed > 0 ? t('customerDetail.creditUsed', { percent: creditUsed }) : t('customerDetail.creditOk')}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        {customer.credit_limit > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill,
                { width: `${Math.min(100, creditUsed)}%` },
                creditUsed > 80 && styles.progressDanger,
              ]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>{t('customerDetail.used')}: {customer.debt_amount?.toLocaleString()} ₽</Text>
              <Text style={styles.progressText}>{t('customerDetail.limit')}: {customer.credit_limit?.toLocaleString()} ₽</Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.creditStats}>
          <View style={styles.creditStatItem}>
            <Text style={styles.creditStatLabel}>{t('customerDetail.availableCredit')}</Text>
            <Text style={[styles.creditStatValue, availableCredit <= 0 && { color: COLORS.error }]}>
              {availableCredit.toLocaleString()} ₽
            </Text>
          </View>
          <View style={styles.creditStatItem}>
            <Text style={styles.creditStatLabel}>{t('customerDetail.debtAmount')}</Text>
            <Text style={[styles.creditStatValue, customer.debt_amount > 0 && { color: COLORS.error }]}>
              {(customer.debt_amount || 0).toLocaleString()} ₽
            </Text>
          </View>
          <View style={styles.creditStatItem}>
            <Text style={styles.creditStatLabel}>{t('customerDetail.totalPaid')}</Text>
            <Text style={[styles.creditStatValue, { color: COLORS.success }]}>{totalPaid.toLocaleString()} ₽</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Customer header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Ionicons name="storefront" size={28} color={COLORS.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{customer.ship_to_name || customer.name}</Text>
          {customer.ship_to_name && <Text style={styles.headerLegal} numberOfLines={1}>{customer.name}</Text>}
          <Text style={styles.headerAddress} numberOfLines={1}>{customer.address}</Text>
          {customer.debt_amount > 0 && (
            <View style={styles.debtBadge}>
              <Text style={styles.debtBadgeText}>{t('customerDetail.debt')}: {customer.debt_amount.toLocaleString()} ₽</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'general' ? 'information-circle-outline' : tab === 'sales' ? 'cart-outline' : 'card-outline'}
              size={18}
              color={activeTab === tab ? COLORS.primary : COLORS.tabBarInactive}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(`customerDetail.tab_${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView style={styles.scrollContent}>
        {activeTab === 'general' && renderGeneral()}
        {activeTab === 'sales' && renderSales()}
        {activeTab === 'credit' && renderCredit()}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
      <View style={styles.infoRowContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },

  // Header
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primary, padding: 16, paddingTop: 8, paddingBottom: 16,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.white + '25',
    justifyContent: 'center', alignItems: 'center',
  },
  headerName: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  headerLegal: { fontSize: 12, color: COLORS.white + 'AA', marginTop: 1 },
  headerAddress: { fontSize: 12, color: COLORS.white + 'CC', marginTop: 2 },
  debtBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.error,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  debtBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.white },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.tabBarInactive },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },

  scrollContent: { flex: 1 },
  tabContent: { padding: 12, paddingBottom: 40 },

  // Info cards
  infoCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  infoRowContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.text, marginTop: 1 },

  // Map
  mapCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 10,
  },
  mapContainer: {
    height: 200, borderRadius: 10, overflow: 'hidden',
  },
  map: { flex: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },
  statBlock: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.primary + '08',
    borderRadius: 10, padding: 12,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Orders
  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  orderNum: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  orderDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  orderStatus: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Credit
  creditCard: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 16, marginBottom: 10,
  },
  creditHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  creditTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  creditSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  progressContainer: { marginBottom: 16 },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  progressDanger: { backgroundColor: COLORS.error },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 11, color: COLORS.textSecondary },
  creditStats: { gap: 10 },
  creditStatItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  creditStatLabel: { fontSize: 13, color: COLORS.textSecondary },
  creditStatValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },
});
