import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getUserById, createUser, updateUser, generateId } from '../../database';

export default function UserEditScreen({ route }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const userId = route.params?.userId;
  const isNew = !userId;

  const ROLES = [
    { key: 'expeditor', label: t('roles.expeditor') },
    { key: 'supervisor', label: t('roles.supervisor') },
    { key: 'admin', label: t('roles.admin') },
  ];

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    role: 'expeditor',
    vehicle_number: '',
    is_active: 1,
  });
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      (async () => {
        try {
          const user = await getUserById(userId);
          if (user) {
            setForm({
              full_name: user.full_name || '',
              username: user.username || '',
              phone: user.phone || '',
              role: user.role || 'expeditor',
              vehicle_number: user.vehicle_number || '',
              is_active: user.is_active ?? 1,
            });
          }
        } catch (e) { console.error('UserEdit load:', e); }
        setLoading(false);
      })();
    }
  }, [userId, isNew]);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      Alert.alert(t('common.error'), t('userEdit.errorName'));
      return;
    }
    if (!form.username.trim()) {
      Alert.alert(t('common.error'), t('userEdit.errorLogin'));
      return;
    }

    try {
      if (isNew) {
        const id = generateId();
        await createUser({
          id,
          ...form,
          password_hash: '1', // Default
        });
        Alert.alert(t('common.success'), t('userEdit.userCreated'), [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await updateUser(userId, form);
        Alert.alert(t('common.success'), t('userEdit.dataUpdated'), [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      console.error('UserEdit save:', e);
      Alert.alert(t('common.error'), t('userEdit.saveError'));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ФИО */}
      <Text style={styles.label}>{t('userEdit.fullName')} *</Text>
      <TextInput
        style={styles.input}
        value={form.full_name}
        onChangeText={(v) => updateField('full_name', v)}
        placeholder={t('userEdit.namePlaceholder')}
        placeholderTextColor={COLORS.tabBarInactive}
      />

      {/* Логин */}
      <Text style={styles.label}>{t('userEdit.loginLabel')} *</Text>
      <TextInput
        style={[styles.input, !isNew && styles.inputDisabled]}
        value={form.username}
        onChangeText={(v) => updateField('username', v)}
        placeholder="ivanov"
        placeholderTextColor={COLORS.tabBarInactive}
        editable={isNew}
        autoCapitalize="none"
      />

      {/* Телефон */}
      <Text style={styles.label}>{t('userEdit.phone')}</Text>
      <TextInput
        style={styles.input}
        value={form.phone}
        onChangeText={(v) => updateField('phone', v)}
        placeholder="+7 (999) 123-45-67"
        placeholderTextColor={COLORS.tabBarInactive}
        keyboardType="phone-pad"
      />

      {/* Роль */}
      <Text style={styles.label}>{t('userEdit.roleLabel')} *</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.roleChip, form.role === r.key && styles.roleChipActive]}
            onPress={() => updateField('role', r.key)}
          >
            <Text style={[styles.roleChipText, form.role === r.key && styles.roleChipTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Транспорт */}
      {form.role === 'expeditor' && (
        <>
          <Text style={styles.label}>{t('userEdit.vehicleNumber')}</Text>
          <TextInput
            style={styles.input}
            value={form.vehicle_number}
            onChangeText={(v) => updateField('vehicle_number', v)}
            placeholder={t('userEdit.platePlaceholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            autoCapitalize="characters"
          />
        </>
      )}

      {/* Статус */}
      <Text style={styles.label}>{t('userEdit.statusLabel')}</Text>
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={[styles.statusChip, form.is_active === 1 && styles.statusActive]}
          onPress={() => updateField('is_active', 1)}
        >
          <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
          <Text style={[styles.statusChipText, form.is_active === 1 && styles.statusChipTextActive]}>{t('userEdit.active')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusChip, form.is_active === 0 && styles.statusInactive]}
          onPress={() => updateField('is_active', 0)}
        >
          <View style={[styles.statusDot, { backgroundColor: COLORS.error }]} />
          <Text style={[styles.statusChipText, form.is_active === 0 && styles.statusChipTextActive]}>{t('userEdit.inactive')}</Text>
        </TouchableOpacity>
      </View>

      {/* Кнопка сохранить */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
        <Text style={styles.saveBtnText}>{isNew ? t('userEdit.createUser') : t('userEdit.saveChanges')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { fontSize: 16, color: COLORS.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  inputDisabled: { backgroundColor: COLORS.background, color: COLORS.textSecondary },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  roleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleChipText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  roleChipTextActive: { color: COLORS.white },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  statusActive: { borderColor: COLORS.success, backgroundColor: COLORS.success + '10' },
  statusInactive: { borderColor: COLORS.error, backgroundColor: COLORS.error + '10' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  statusChipTextActive: { fontWeight: '600' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, marginTop: 32 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});
