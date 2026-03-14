import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { shipOrdersByRoutePoint, decreaseStock, createDeliveryWithItems } from '../../database';
import useAuthStore from '../../store/authStore';

export default function SignatureScreen({ route }) {
  const { t } = useTranslation();
  const { type, pointId, customerId, items: shipmentItems } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!name.trim()) {
      Alert.alert('', t('signatureScreen.enterRecipientName'));
      return;
    }
    Alert.alert(t('signatureScreen.confirmReceipt'), t('signatureScreen.recipient', { name: name.trim() }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('signatureScreen.confirmButton'), onPress: async () => {
          try {
            if (type === 'shipment' && pointId) {
              await shipOrdersByRoutePoint(pointId);
              // Save delivery record with all items (including added ones)
              if (shipmentItems?.length > 0) {
                const totalAmount = shipmentItems.reduce((s, i) => s + (i.delivered || 0) * (i.price || 0), 0);
                await createDeliveryWithItems(
                  {
                    route_point_id: pointId,
                    customer_id: customerId,
                    driver_id: user?.id,
                    total_amount: totalAmount,
                    signature_name: name.trim(),
                  },
                  shipmentItems
                    .filter((i) => i.delivered > 0)
                    .map((i) => ({
                      product_id: i.product_id,
                      ordered_quantity: i.quantity || 0,
                      delivered_quantity: i.delivered,
                      price: i.price || 0,
                    }))
                );
              }
              // Decrease vehicle stock by delivered quantities
              if (user?.vehicleId && shipmentItems?.length > 0) {
                const stockItems = shipmentItems
                  .filter((i) => i.delivered > 0)
                  .map((i) => ({ product_id: i.product_id, quantity: i.delivered }));
                if (stockItems.length > 0) {
                  await decreaseStock(user.vehicleId, stockItems);
                }
              }
            }
            setConfirmed(true);
            Alert.alert(t('common.done'), t('signatureScreen.signatureConfirmed'), [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (e) {
            console.error('Signature confirm error:', e);
            Alert.alert(t('common.error'), e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="create-outline" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{t('signatureScreen.receiptTitle')}</Text>
        <Text style={styles.subtitle}>
          {type === 'shipment' ? t('signatureScreen.shipmentConfirmation') : t('signatureScreen.documentConfirmation')}
        </Text>

        <Text style={styles.label}>{t('signatureScreen.recipientLabel')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('signatureScreen.namePlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          editable={!confirmed}
        />

        {/* Зона подписи (заглушка) */}
        <View style={styles.signatureArea}>
          <Ionicons name="finger-print-outline" size={40} color={COLORS.tabBarInactive} />
          <Text style={styles.signatureText}>{t('signatureScreen.signatureZone')}</Text>
          <Text style={styles.signatureHint}>{t('signatureScreen.signatureHint')}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.confirmBtn, confirmed && styles.confirmedBtn]}
        onPress={handleConfirm}
        disabled={confirmed}
      >
        <Ionicons name={confirmed ? 'checkmark-circle' : 'create'} size={22} color={COLORS.white} />
        <Text style={styles.confirmText}>{confirmed ? t('signatureScreen.confirmed') : t('signatureScreen.confirmButton')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, alignItems: 'center' },
  iconWrap: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  input: { width: '100%', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 20 },
  signatureArea: { width: '100%', height: 150, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  signatureText: { fontSize: 14, color: COLORS.tabBarInactive, marginTop: 8 },
  signatureHint: { fontSize: 12, color: COLORS.tabBarInactive, marginTop: 4 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, marginTop: 24 },
  confirmedBtn: { backgroundColor: '#34C759' },
  confirmText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
