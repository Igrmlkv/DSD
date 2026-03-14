import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { I18nextProvider, useTranslation } from 'react-i18next';
import YaMap from 'react-native-yamap';
import i18n, { initI18n } from './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database';
import useSettingsStore from './src/store/settingsStore';

YaMap.init('b86f674c-5cc1-470b-aadf-9ae9091faee9');

function AppContent() {
  const { t } = useTranslation();
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    Promise.all([
      initI18n(),
      initDatabase(),
      loadSettings(),
    ])
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Init error:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Initialization error: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Image source={require('./logo_2.jpg')} style={styles.logo} />
        <ActivityIndicator size="large" color="#1E3A5F" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AppContent />
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  logo: { width: 150, height: 290, resizeMode: 'contain', marginBottom: 20 },
  loading: { marginTop: 12, fontSize: 14, color: '#666' },
  error: { fontSize: 14, color: 'red', textAlign: 'center', padding: 20 },
});
