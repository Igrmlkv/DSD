import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { searchProductByBarcode } from '../../database';

export default function ScanningScreen({ route }) {
  const { t } = useTranslation();
  const { type, tripId } = route.params || {};
  const navigation = useNavigation();
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [scannedList, setScannedList] = useState([]);

  const handleSearch = async () => {
    if (!barcode.trim()) return;
    try {
      const product = await searchProductByBarcode(barcode.trim());
      if (product) {
        setResult(product);
        setScannedList((prev) => [
          { barcode: barcode.trim(), product, time: new Date().toLocaleTimeString('ru-RU') },
          ...prev,
        ]);
      } else {
        Alert.alert(t('scanningScreen.notFound'), t('scanningScreen.barcodeNotFound', { barcode }));
        setResult(null);
      }
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    }
    setBarcode('');
  };

  return (
    <View style={styles.container}>
      {/* Камера-заглушка */}
      <View style={styles.cameraPlaceholder}>
        <Ionicons name="camera" size={64} color={COLORS.tabBarInactive} />
        <Text style={styles.cameraText}>{t('scanningScreen.cameraTitle')}</Text>
        <Text style={styles.cameraSub}>{t('scanningScreen.cameraInDev')}</Text>
      </View>

      {/* Ручной ввод */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.barcodeInput}
          value={barcode}
          onChangeText={setBarcode}
          placeholder={t('scanningScreen.barcodePlaceholder')}
          placeholderTextColor={COLORS.tabBarInactive}
          keyboardType="numeric"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Результат */}
      {result && (
        <View style={styles.resultCard}>
          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          <View style={styles.resultInfo}>
            <Text style={styles.resultName}>{result.name}</Text>
            <Text style={styles.resultSku}>{result.sku} • {result.base_price} ₽</Text>
          </View>
        </View>
      )}

      {/* История */}
      <Text style={styles.historyTitle}>{t('scanningScreen.scannedTitle')} ({scannedList.length})</Text>
      {scannedList.map((s, i) => (
        <View key={i} style={styles.historyRow}>
          <Text style={styles.historyName} numberOfLines={1}>{s.product.name}</Text>
          <Text style={styles.historyTime}>{s.time}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  cameraPlaceholder: {
    height: 200, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center',
  },
  cameraText: { fontSize: 16, color: '#888', marginTop: 8 },
  cameraSub: { fontSize: 12, color: '#666', marginTop: 4 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8 },
  barcodeInput: { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text },
  searchBtn: { width: 50, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12,
    backgroundColor: '#34C75910', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  resultSku: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, paddingHorizontal: 16, marginBottom: 8 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, marginHorizontal: 12, borderRadius: 8, padding: 12, marginBottom: 4,
  },
  historyName: { flex: 1, fontSize: 13, color: COLORS.text },
  historyTime: { fontSize: 12, color: COLORS.textSecondary },
});
