import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import YaMap from 'react-native-yamap';
import './src/i18n';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database';
import useSettingsStore from './src/store/settingsStore';

YaMap.init('b86f674c-5cc1-470b-aadf-9ae9091faee9');

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([
      initDatabase(),
      loadSettings(),
    ])
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('Init error:', err);
        setDbError(err.message);
      });
  }, []);

  if (dbError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{t('app.initError', { error: dbError })}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <Image source={require('./logo_2.jpg')} style={styles.logo} />
        <ActivityIndicator size="large" color="#1E3A5F" style={{ marginTop: 20 }} />
        <Text style={styles.loading}>{t('app.initializing')}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  logo: { width: 150, height: 290, resizeMode: 'contain', marginBottom: 20 },
  loading: { marginTop: 12, fontSize: 14, color: '#666' },
  error: { fontSize: 14, color: 'red', textAlign: 'center', padding: 20 },
});
