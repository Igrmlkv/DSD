import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { INVOICE_STATUS } from '../../constants/statuses';
import { getInvoiceWithItems, getReceiptById, getDeliveryNoteByDelivery } from '../../services/invoiceService';
import { getDeliveryItems } from '../../database';
import { getHtmlForDocument, printDocument, shareDocument, generatePdf } from '../../services/documentService';
import useSettingsStore from '../../store/settingsStore';

export default function DocumentViewScreen({ route }) {
  const { t } = useTranslation();
  const { type, documentId, deliveryId } = route.params || {};
  const printFormType = useSettingsStore((s) => s.printFormType);
  const companyInfo = useSettingsStore((s) => s.companyInfo);
  const [document, setDocument] = useState(null);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocument();
  }, [type, documentId, deliveryId]);

  const loadDocument = async () => {
    try {
      switch (type) {
        case 'invoice': {
          const inv = await getInvoiceWithItems(documentId);
          setDocument(inv);
          break;
        }
        case 'receipt': {
          const rcp = await getReceiptById(documentId);
          setDocument(rcp);
          break;
        }
        case 'delivery_note': {
          const dn = await getDeliveryNoteByDelivery(deliveryId || documentId);
          if (dn) {
            const di = await getDeliveryItems(dn.delivery_id);
            setDocument(dn);
            setItems(di);
          }
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error('Load document error:', e);
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'invoice': return t('document.invoice');
      case 'receipt': return t('document.receipt');
      case 'delivery_note': return t('document.deliveryNote');
      default: return t('document.title');
    }
  };

  const getDocNumber = () => {
    if (!document) return '';
    return document.invoice_number || document.receipt_number || document.note_number || '';
  };

  const handlePrint = async () => {
    try {
      const html = getHtmlForDocument(type, document, items, printFormType, companyInfo);
      await printDocument(html);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleShare = async () => {
    try {
      const html = getHtmlForDocument(type, document, items, printFormType, companyInfo);
      const fileName = `${type}_${getDocNumber()}.pdf`;
      const pdfUri = await generatePdf(html, fileName);
      await shareDocument(pdfUri);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.tabBarInactive} />
        <Text style={styles.emptyText}>{t('document.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={type === 'receipt' ? 'receipt-outline' : type === 'delivery_note' ? 'clipboard-outline' : 'document-text-outline'}
            size={48}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.docType}>{getTitle()}</Text>
        <Text style={styles.docNumber}>{getDocNumber()}</Text>
        <Text style={styles.docDate}>
          {new Date(document.invoice_date || document.receipt_date || document.note_date).toLocaleDateString('ru-RU')}
        </Text>

        {document.customer_name && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{document.customer_name}</Text>
          </View>
        )}

        {(document.total_amount != null || document.amount_paid != null) && (
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>
              {type === 'receipt' ? t('document.amountPaid') : t('document.totalAmount')}
            </Text>
            <Text style={styles.amountValue}>
              {(document.total_amount || document.amount_paid || 0).toLocaleString()} ₽
            </Text>
          </View>
        )}

        {type === 'invoice' && document.status && (
          <View style={[styles.statusBadge, document.status === INVOICE_STATUS.CONFIRMED ? styles.statusConfirmed : styles.statusDraft]}>
            <Text style={[styles.statusText, document.status === INVOICE_STATUS.CONFIRMED && styles.statusTextConfirmed]}>
              {document.status === INVOICE_STATUS.CONFIRMED ? t('invoice.statusConfirmed') : t('invoice.statusDraft')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.actionRow} onPress={handlePrint}>
          <View style={styles.actionIcon}><Ionicons name="print-outline" size={22} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{t('document.print')}</Text>
            <Text style={styles.actionSub}>{t('document.printSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.tabBarInactive} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleShare}>
          <View style={styles.actionIcon}><Ionicons name="share-outline" size={22} color={COLORS.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{t('document.share')}</Text>
            <Text style={styles.actionSub}>{t('document.shareSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.tabBarInactive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconContainer: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: COLORS.primary + '10',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  docType: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  docNumber: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  docDate: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  infoText: { fontSize: 15, color: COLORS.text },
  amountBlock: { marginTop: 20, alignItems: 'center' },
  amountLabel: { fontSize: 12, color: COLORS.textSecondary },
  amountValue: { fontSize: 28, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 16 },
  statusDraft: { backgroundColor: COLORS.accent + '20' },
  statusConfirmed: { backgroundColor: COLORS.success + '20' },
  statusText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  statusTextConfirmed: { color: COLORS.success },
  actionsCard: {
    backgroundColor: COLORS.white, borderRadius: 14, marginTop: 16, overflow: 'hidden',
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  actionIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  actionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 68 },
});
