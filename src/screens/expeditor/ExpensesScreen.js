import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { CHECKIN_STATUS } from '../../constants/statuses';
import useAuthStore from '../../store/authStore';
import {
  getExpenseTypes, getTodayExpenses, createExpense, updateExpense, deleteExpense,
  getTodayTourCheckin,
} from '../../database';

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

  const openAddModal = () => {
    if (!tourStarted) {
      Alert.alert('', t('expenses.tourNotStarted'));
      return;
    }
    setEditingExpense(null);
    setSelectedType(expenseTypes[0] || null);
    setAmount('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (expense) => {
    if (!tourStarted) return;
    setEditingExpense(expense);
    setSelectedType(expenseTypes.find((et) => et.id === expense.expense_type_id) || null);
    setAmount(String(expense.amount));
    setNotes(expense.notes || '');
    setShowModal(true);
  };

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
      if (editingExpense) {
        await updateExpense(editingExpense.id, { amount: amountNum, notes });
      } else {
        await createExpense({
          driver_id: user?.id,
          tour_checkin_id: checkinId,
          expense_type_id: selectedType.id,
          expense_type_name: selectedType.name,
          amount: amountNum,
          notes,
        });
      }
      setShowModal(false);
      await loadData();
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
  };

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

  const renderExpense = ({ item }) => (
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
        <Text style={styles.expenseType}>{getTypeName(item.expense_type_id, item.type_name || item.expense_type_name || t('expenses.unknown'))}</Text>
        {item.notes ? <Text style={styles.expenseNotes} numberOfLines={1}>{item.notes}</Text> : null}
        <Text style={styles.expenseTime}>
          {new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={styles.expenseAmount}>{item.amount.toLocaleString()} ₽</Text>
      {tourStarted && (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tour not started warning */}
      {!tourStarted && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={18} color={COLORS.accent} />
          <Text style={styles.warningText}>{t('expenses.tourNotStarted')}</Text>
        </View>
      )}

      {/* Summary card */}
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

      {/* Expenses list */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.tabBarInactive} />
            <Text style={styles.emptyText}>{t('expenses.noExpenses')}</Text>
            {tourStarted && (
              <Text style={styles.emptyHint}>{t('expenses.addHint')}</Text>
            )}
          </View>
        }
      />

      {/* FAB add button */}
      {tourStarted && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingExpense ? t('expenses.editExpense') : t('expenses.addExpense')}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Expense type selector */}
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

          {/* Amount input */}
          <Text style={styles.fieldLabel}>{t('expenses.amountLabel')}</Text>
          <View style={styles.amountInputRow}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.tabBarInactive}
              autoFocus
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

          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Ionicons name="checkmark" size={22} color={COLORS.white} />
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  expenseAmount: { fontSize: 16, fontWeight: '700', color: COLORS.text },
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
  modal: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
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
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, marginTop: 24,
  },
  saveBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
