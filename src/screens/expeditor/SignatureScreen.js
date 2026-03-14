import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { shipOrdersByRoutePoint, decreaseStock, createDeliveryWithItems } from '../../database';
import useAuthStore from '../../store/authStore';
import SignaturePad from '../../components/SignaturePad';

export default function SignatureScreen({ route }) {
  const { t } = useTranslation();
  const { type, pointId, customerId, items: shipmentItems } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();

  const [recipientName, setRecipientName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [hasClientSig, setHasClientSig] = useState(false);
  const [hasDriverSig, setHasDriverSig] = useState(false);
  const [clientSigData, setClientSigData] = useState(null);
  const [driverSigData, setDriverSigData] = useState(null);

  const clientSigRef = useRef(null);
  const driverSigRef = useRef(null);

  const handleClientSigChange = useCallback((hasSig, data) => {
    setHasClientSig(hasSig);
    if (data) setClientSigData(data);
  }, []);

  const handleDriverSigChange = useCallback((hasSig, data) => {
    setHasDriverSig(hasSig);
    if (data) setDriverSigData(data);
  }, []);

  const readSignatures = () => {
    clientSigRef.current?.readSignature();
    driverSigRef.current?.readSignature();
  };

  const canConfirm = recipientName.trim() && hasClientSig;

  const handleConfirm = () => {
    if (!recipientName.trim()) {
      Alert.alert('', t('signatureScreen.enterRecipientName'));
      return;
    }
    if (!hasClientSig) {
      Alert.alert('', t('signatureScreen.clientSignatureRequired'));
      return;
    }

    // Read final signature data before confirming
    readSignatures();

    setTimeout(() => {
      Alert.alert(
        t('signatureScreen.confirmReceipt'),
        t('signatureScreen.recipient', { name: recipientName.trim() }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('signatureScreen.confirmButton'),
            onPress: async () => {
              try {
                if (type === 'shipment' && pointId) {
                  await shipOrdersByRoutePoint(pointId);
                  if (shipmentItems?.length > 0) {
                    const totalAmount = shipmentItems.reduce(
                      (s, i) => s + (i.delivered || 0) * (i.price || 0), 0
                    );
                    await createDeliveryWithItems(
                      {
                        route_point_id: pointId,
                        customer_id: customerId,
                        driver_id: user?.id,
                        total_amount: totalAmount,
                        signature_name: recipientName.trim(),
                        signature_data: clientSigData,
                        signature_driver_data: driverSigData,
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
        ]
      );
    }, 200);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="create-outline" size={32} color={COLORS.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.title}>{t('signatureScreen.receiptTitle')}</Text>
              <Text style={styles.subtitle}>
                {type === 'shipment'
                  ? t('signatureScreen.shipmentConfirmation')
                  : t('signatureScreen.documentConfirmation')}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>{t('signatureScreen.recipientLabel')}</Text>
          <TextInput
            style={styles.input}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder={t('signatureScreen.namePlaceholder')}
            placeholderTextColor={COLORS.tabBarInactive}
            editable={!confirmed}
          />

          {/* Client signature */}
          <SignaturePad
            ref={clientSigRef}
            label={t('signatureScreen.clientSignature')}
            height={180}
            onSignChange={handleClientSigChange}
          />

          {/* Driver signature */}
          <SignaturePad
            ref={driverSigRef}
            label={t('signatureScreen.driverSignature')}
            height={180}
            onSignChange={handleDriverSigChange}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            confirmed && styles.confirmedBtn,
            !canConfirm && !confirmed && styles.disabledBtn,
          ]}
          onPress={handleConfirm}
          disabled={confirmed || !canConfirm}
        >
          <Ionicons
            name={confirmed ? 'checkmark-circle' : 'create'}
            size={22}
            color={COLORS.white}
          />
          <Text style={styles.confirmText}>
            {confirmed ? t('signatureScreen.confirmed') : t('signatureScreen.confirmButton')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  confirmedBtn: { backgroundColor: '#34C759' },
  disabledBtn: { opacity: 0.5 },
  confirmText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
