import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image, ScrollView,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Directory, Paths } from 'expo-file-system/next';
import { COLORS } from '../../constants/colors';
import { CHECKIN_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getExpenseTypes, getTodayExpenses, createExpense, updateExpense, deleteExpense,
  getTodayTourCheckin,
  createExpenseAttachment, getExpenseAttachments, deleteExpenseAttachment, deleteAllExpenseAttachments,
} from '../../database';

const attachmentsDir = new Directory(Paths.document, 'expense_attachments');

function ensureDir() {
  if (!attachmentsDir.exists) attachmentsDir.create();
}

async function copyToAppDir(sourceUri, fileName) {
  ensureDir();
  const source = new File(sourceUri);
  const dest = new File(attachmentsDir, fileName);
  await source.copy(dest);
  return dest.uri;
}

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const getTypeName = (typeId, fallback) => {
    const map = {
      'et-gas': 'gas', 'et-tolls': 'tolls', 'et-parking': 'parking',
      'et-meals': 'meals', 'et-maintenance': 'maintenance', 'et-other': 'other',
    };
    const key = map[typeId];
    return key ? t(`expenses.types.${key}`) : fallback;
  };

  const [expenses, setExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [tourStarted, setTourStarted] = useState(false);
  const [checkinId, setCheckinId] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState([]); // { id?, fileType, localUri, fileName, isNew? }
  const [previewUri, setPreviewUri] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const types = await getExpenseTypes();
      setExpenseTypes(types);
      const startCheckin = await getTodayTourCheckin(user?.id, 'start');
      const started = startCheckin?.status === CHECKIN_STATUS.COMPLETED;
      setTourStarted(started);
      if (startCheckin) setCheckinId(startCheckin.id);
      const todayExpenses = await getTodayExpenses(user?.id);
      setExpenses(todayExpenses);
    } catch (e) {
      console.error('Expenses load error:', e);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  // ─── Attachment helpers ─────────────────────────────────────────────────────

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'Нет доступа к камере');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]) {
      await addImageAsset(result.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'Нет доступа к галерее');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]) {
      await addImageAsset(result.assets[0]);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const isPdf = asset.mimeType === 'application/pdf' || asset.name?.endsWith('.pdf');
        const fileName = `${Date.now()}_${asset.name}`;
        const destUri = await copyToAppDir(asset.uri, fileName);
        setAttachments((prev) => [
          ...prev,
          { fileType: isPdf ? 'pdf' : 'image', localUri: destUri, fileName: asset.name, isNew: true },
        ]);
      }
    } catch (e) {
      console.error('Document pick error:', e);
    }
  };

  const addImageAsset = async (asset) => {
    const ext = asset.uri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const destUri = await copyToAppDir(asset.uri, fileName);
    setAttachments((prev) => [
      ...prev,
      { fileType: 'image', localUri: destUri, fileName, isNew: true },
    ]);
  };

  const showAttachmentPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Отмена', 'Сделать фото', 'Выбрать из галереи', 'Прикрепить файл (PDF/JPG)'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) pickFromCamera();
          else if (idx === 2) pickFromGallery();
          else if (idx === 3) pickDocument();
        }
      );
    } else {
      Alert.alert('Прикрепить файл', '', [
        { text: 'Камера', onPress: pickFromCamera },
        { text: 'Галерея', onPress: pickFromGallery },
        { text: 'Файл (PDF/JPG)', onPress: pickDocument },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  };

  const removeAttachment = async (attachment, index) => {
    if (attachment.id) {
      const uri = await deleteExpenseAttachment(attachment.id);
      if (uri) { try { const f = new File(uri); if (f.exists) await f.delete(); } catch { /* ok */ } }
    } else {
      try { const f = new File(attachment.localUri); if (f.exists) await f.delete(); } catch { /* ok */ }
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Modal open/close ───────────────────────────────────────────────────────

  const openAddModal = () => {
    if (!tourStarted) {
      Alert.alert('', t('expenses.tourNotStarted'));
      return;
    }
    setEditingExpense(null);
    setSelectedType(expenseTypes[0] || null);
    setAmount('');
    setNotes('');
    setAttachments([]);
    setShowModal(true);
  };

  const openEditModal = async (expense) => {
    if (!tourStarted) return;
    setEditingExpense(expense);
    setSelectedType(expenseTypes.find((et) => et.id === expense.expense_type_id) || null);
    setAmount(String(expense.amount));
    setNotes(expense.notes || '');
    try {
      const existing = await getExpenseAttachments(expense.id);
      setAttachments(existing.map((a) => ({
        id: a.id,
        fileType: a.file_type,
        localUri: a.local_uri,
        fileName: a.file_name,
      })));
    } catch { setAttachments([]); }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    attachments.filter((a) => a.isNew).forEach(async (a) => {
      try { const f = new File(a.localUri); if (f.exists) await f.delete(); } catch { /* ok */ }
    });
    setShowModal(false);
    setAttachments([]);
  };

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('', t('expenses.invalidAmount'));
      return;
    }
    if (!selectedType) {
      Alert.alert('', t('expenses.selectType'));
      return;
    }
    try {
      let expenseId;
      if (editingExpense) {
        await updateExpense(editingExpense.id, { amount: amountNum, notes });
        expenseId = editingExpense.id;
      } else {
        expenseId = await createExpense({
          driver_id: user?.id,
          tour_checkin_id: checkinId,
          expense_type_id: selectedType.id,
          expense_type_name: selectedType.name,
          amount: amountNum,
          notes,
        });
      }
      // Save new attachments to DB
      const newAttachments = attachments.filter((a) => a.isNew);
      for (const att of newAttachments) {
        await createExpenseAttachment({
          expenseId,
          fileType: att.fileType,
          localUri: att.localUri,
          fileName: att.fileName,
        });
      }
      setShowModal(false);
      setAttachments([]);
      await loadData();
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  // ─── Delete expense ─────────────────────────────────────────────────────────

  const handleDelete = (expense) => {
    Alert.alert(
      t('expenses.deleteTitle'),
      t('expenses.deleteMsg', { amount: expense.amount.toLocaleString() }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const uris = await deleteAllExpenseAttachments(expense.id);
              for (const uri of uris) {
                try { const f = new File(uri); if (f.exists) await f.delete(); } catch { /* ok */ }
              }
              await deleteExpense(expense.id);
              await loadData();
            } catch (e) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const renderAttachmentThumbnail = (att, index, canDelete = true) => (
    <View key={`att-${index}`} style={styles.attThumb}>
      {att.fileType === 'image' ? (
        <TouchableOpacity onPress={() => setPreviewUri(att.localUri)}>
          <Image source={{ uri: att.localUri }} style={styles.attImage} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.attPdf}>
          <Ionicons name="document-text" size={24} color={COLORS.error} />
          <Text style={styles.attPdfName} numberOfLines={1}>{att.fileName || 'PDF'}</Text>
        </TouchableOpacity>
      )}
      {canDelete && (
        <TouchableOpacity
          style={styles.attDeleteBtn}
          onPress={() => removeAttachment(att, index)}
        >
          <Ionicons name="close-circle" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderExpense = ({ item }) => {
    const hasAttachments = item.attachment_count > 0;
    return (
      <TouchableOpacity
        style={styles.expenseRow}
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
        disabled={!tourStarted}
      >
        <View style={styles.expenseIcon}>
          <Ionicons name={item.type_icon || 'cash-outline'} size={22} color={COLORS.primary} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseType}>
            {getTypeName(item.expense_type_id, item.type_name || item.expense_type_name || t('expenses.unknown'))}
          </Text>
          {item.notes ? <Text style={styles.expenseNotes} numberOfLines={1}>{item.notes}</Text> : null}
          <Text style={styles.expenseTime}>
            {new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>{item.amount.toLocaleString()} ₽</Text>
          {hasAttachments && (
            <Ionicons name="attach" size={16} color={COLORS.textSecondary} style={styles.attachIcon} />
          )}
        </View>
        {tourStarted && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {!tourStarted && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={18} color={COLORS.accent} />
          <Text style={styles.warningText}>{t('expenses.tourNotStarted')}</Text>
        </View>
      )}

      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>{t('expenses.todayTotal')}</Text>
          <Text style={styles.summaryAmount}>{totalAmount.toLocaleString()} ₽</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryCount}>{expenses.length}</Text>
          <Text style={styles.summaryCountLabel}>{t('expenses.records')}</Text>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('expenses.noExpenses')}</Text>
            {tourStarted && <Text style={styles.emptyHint}>{t('expenses.addHint')}</Text>}
          </View>
        }
      />

      {tourStarted && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExpense ? t('expenses.editExpense') : t('expenses.addExpense')}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Type selector (only for new) */}
            {!editingExpense && (
              <>
                <Text style={styles.fieldLabel}>{t('expenses.typeLabel')}</Text>
                <View style={styles.typesGrid}>
                  {expenseTypes.map((et) => (
                    <TouchableOpacity
                      key={et.id}
                      style={[styles.typeChip, selectedType?.id === et.id && styles.typeChipActive]}
                      onPress={() => setSelectedType(et)}
                    >
                      <Ionicons
                        name={et.icon || 'cash-outline'}
                        size={20}
                        color={selectedType?.id === et.id ? COLORS.white : COLORS.primary}
                      />
                      <Text style={[
                        styles.typeChipText,
                        selectedType?.id === et.id && styles.typeChipTextActive,
                      ]}>
                        {getTypeName(et.id, et.name)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Amount */}
            <Text style={styles.fieldLabel}>{t('expenses.amountLabel')}</Text>
            <View style={styles.amountInputRow}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.tabBarInactive}
                autoFocus={!editingExpense}
              />
              <Text style={styles.currencyLabel}>₽</Text>
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>{t('expenses.notesLabel')}</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('expenses.notesPlaceholder')}
              placeholderTextColor={COLORS.tabBarInactive}
              multiline
            />

            {/* Attachments */}
            <Text style={styles.fieldLabel}>Вложения</Text>
            <View style={styles.attachmentsSection}>
              {attachments.length > 0 && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attRow}>
                    {attachments.map((att, idx) => renderAttachmentThumbnail(att, idx, true))}
                  </ScrollView>
                  <View style={styles.attFileList}>
                    {attachments.map((att, idx) => (
                      <View key={`name-${idx}`} style={styles.attFileItem}>
                        <Ionicons
                          name={att.fileType === 'pdf' ? 'document-text-outline' : 'image-outline'}
                          size={16}
                          color={att.fileType === 'pdf' ? COLORS.error : COLORS.primary}
                        />
                        <Text style={styles.attFileName} numberOfLines={1}>
                          {att.fileName || (att.fileType === 'pdf' ? 'document.pdf' : 'photo.jpg')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.addAttachBtn} onPress={showAttachmentPicker}>
                <Ionicons name="attach" size={20} color={COLORS.primary} />
                <Text style={styles.addAttachText}>
                  {attachments.length === 0 ? 'Прикрепить файл / фото' : 'Добавить ещё'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={22} color={COLORS.white} />
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image preview modal */}
      <Modal visible={!!previewUri} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewUri(null)}>
            <Ionicons name="close-circle" size={36} color={COLORS.white} />
          </TouchableOpacity>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent + '20', padding: 10,
  },
  warningText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  summaryCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, margin: 12, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryLeft: {},
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryAmount: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  summaryRight: { alignItems: 'center' },
  summaryCount: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  summaryCountLabel: { fontSize: 11, color: COLORS.textSecondary },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 14, gap: 12, marginBottom: 6,
  },
  expenseIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  expenseInfo: { flex: 1 },
  expenseType: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  expenseNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  expenseTime: { fontSize: 11, color: COLORS.tabBarInactive, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 4 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  attachIcon: { marginTop: 2 },
  deleteBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  emptyHint: { fontSize: 13, color: COLORS.tabBarInactive },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  // Modal
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalContent: { padding: 16, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingTop: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  typeChipTextActive: { color: COLORS.white },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 28, fontWeight: '700', color: COLORS.text, textAlign: 'center',
  },
  currencyLabel: { fontSize: 24, fontWeight: '600', color: COLORS.textSecondary },
  notesInput: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, minHeight: 60, textAlignVertical: 'top',
  },
  // Attachments
  attachmentsSection: { gap: 10 },
  attRow: { flexDirection: 'row' },
  attThumb: { position: 'relative', marginRight: 10 },
  attImage: { width: 80, height: 80, borderRadius: 10 },
  attPdf: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: COLORS.error + '10',
    justifyContent: 'center', alignItems: 'center', gap: 4, padding: 6,
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  attPdfName: { fontSize: 9, color: COLORS.error, textAlign: 'center' },
  attDeleteBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: COLORS.white, borderRadius: 10,
  },
  attFileList: { gap: 6, marginTop: 8 },
  attFileItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  attFileName: { fontSize: 13, color: COLORS.text, flex: 1 },
  addAttachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.primary + '40', borderStyle: 'dashed',
  },
  addAttachText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, marginTop: 24,
  },
  saveBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  // Preview
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  previewImage: { width: '100%', height: '80%' },
});
