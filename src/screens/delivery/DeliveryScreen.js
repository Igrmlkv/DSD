import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllCustomers } from '../../database';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';

function formatMoney(v) {
  return Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' R';
}

export default function DeliveryScreen() {
  const { t } = useTranslation();

  const TYPE_LABELS = {
    retail: t('deliveryScreen.types.retail'),
    wholesale: t('deliveryScreen.types.wholesale'),
    horeca: 'HoReCa',
  };

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [])
  );

  async function loadCustomers() {
    try {
      const customers = await getAllCustomers();
      // Group by city
      const grouped = {};
      for (const c of customers) {
        const city = c.city || t('deliveryScreen.other');
        if (!grouped[city]) grouped[city] = [];
        grouped[city].push(c);
      }
      const secs = Object.entries(grouped).map(([city, data]) => ({
        title: city,
        count: data.length,
        data,
      }));
      setSections(secs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function renderCustomer({ item }) {
    const debtRatio = item.credit_limit > 0 ? item.debt_amount / item.credit_limit : 0;
    const debtColor = debtRatio > 0.8 ? COLORS.error : debtRatio > 0.5 ? COLORS.accent : '#4CAF50';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.legalName}>{item.legal_name}</Text>
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{TYPE_LABELS[item.customer_type] || item.customer_type}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.metaItem}>
            <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.phone || '-'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.contact_person || '-'}</Text>
          </View>
          {item.debt_amount > 0 ? (
            <View style={styles.debtBadge}>
              <Text style={[styles.debtText, { color: debtColor }]}>
                {t('deliveryScreen.debt')}: {formatMoney(item.debt_amount)}
              </Text>
            </View>
          ) : (
            <View style={styles.debtBadge}>
              <Text style={[styles.debtText, { color: '#4CAF50' }]}>{t('deliveryScreen.noDebt')}</Text>
            </View>
          )}
        </View>
        {item.credit_limit > 0 && (
          <View style={styles.creditBar}>
            <View style={styles.creditTrack}>
              <View
                style={[styles.creditFill, {
                  width: `${Math.min(debtRatio * 100, 100)}%`,
                  backgroundColor: debtColor,
                }]}
              />
            </View>
            <Text style={styles.creditText}>
              {formatMoney(item.debt_amount)} / {formatMoney(item.credit_limit)}
            </Text>
          </View>
        )}
      </View>
    );
  }

  function renderSectionHeader({ section }) {
    return (
      <View style={styles.sectionHeader}>
        <Ionicons name="location" size={16} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{section.count}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const total = sections.reduce((s, sec) => s + sec.count, 0);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>{t('deliveryScreen.clientsInCities', { total, cities: sections.length })}</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="cube-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('deliveryScreen.noClients')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  topBarText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 30 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 4, marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, flex: 1 },
  sectionCount: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionCountText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 8, padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  legalName: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  address: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  typeBadge: {
    backgroundColor: COLORS.info + '20', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  typeText: { fontSize: 11, fontWeight: '600', color: COLORS.info },
  cardBottom: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12, flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  debtBadge: { marginLeft: 'auto' },
  debtText: { fontSize: 12, fontWeight: '700' },
  creditBar: { marginTop: 8 },
  creditTrack: {
    height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden',
  },
  creditFill: { height: '100%', borderRadius: 2 },
  creditText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 3, textAlign: 'right' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
});
