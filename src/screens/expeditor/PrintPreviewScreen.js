import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getInvoiceWithItems, getReceiptById, getDeliveryNoteByDelivery } from '../../services/invoiceService';
import { getDeliveryItems } from '../../database';
import { getHtmlForDocument, printDocument, shareDocument, generatePdf } from '../../services/documentService';
import useSettingsStore from '../../store/settingsStore';

export default function PrintPreviewScreen({ route }) {
  const { t } = useTranslation();
  const { type, documentId, deliveryId } = route.params || {};
  const printFormType = useSettingsStore((s) => s.printFormType);
  const companyInfo = useSettingsStore((s) => s.companyInfo);
  const [html, setHtml] = useState(null);
  const [docNumber, setDocNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndRender();
  }, [type, documentId, deliveryId]);

  const loadAndRender = async () => {
    try {
      let doc = null;
      let items = null;

      switch (type) {
        case 'invoice': {
          doc = await getInvoiceWithItems(documentId);
          break;
        }
        case 'receipt': {
          doc = await getReceiptById(documentId);
          break;
        }
        case 'delivery_note': {
          doc = await getDeliveryNoteByDelivery(deliveryId || documentId);
          if (doc) items = await getDeliveryItems(doc.delivery_id);
          break;
        }
      }

      if (doc) {
        setHtml(getHtmlForDocument(type, doc, items, printFormType, companyInfo));
        setDocNumber(doc.invoice_number || doc.receipt_number || doc.note_number || '');
      }
    } catch (e) {
      console.error('PrintPreview load error:', e);
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      await printDocument(html);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleShare = async () => {
    try {
      const pdfUri = await generatePdf(html, `${type}_${docNumber}.pdf`);
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

  if (!html) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.tabBarInactive} />
        <Text style={styles.emptyText}>{t('document.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Preview using ScrollView with HTML rendered as text fallback */}
      <ScrollView style={styles.preview} contentContainerStyle={styles.previewContent}>
        <View style={styles.previewPlaceholder}>
          <Ionicons name="document-text" size={64} color={COLORS.primary} />
          <Text style={styles.previewTitle}>{docNumber}</Text>
          <Text style={styles.previewSub}>{t('document.previewReady')}</Text>
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handlePrint}>
          <Ionicons name="print" size={24} color={COLORS.white} />
          <Text style={styles.actionText}>{t('document.print')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
          <Ionicons name="share" size={24} color={COLORS.primary} />
          <Text style={[styles.actionText, styles.shareText]}>{t('document.share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  preview: { flex: 1 },
  previewContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewPlaceholder: { alignItems: 'center', gap: 12 },
  previewTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  previewSub: { fontSize: 14, color: COLORS.textSecondary },
  actionBar: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 5,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 14,
  },
  shareBtn: {
    backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.primary,
  },
  actionText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  shareText: { color: COLORS.primary },
});
