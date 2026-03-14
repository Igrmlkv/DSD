import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/colors';

// Supports both direct props and navigation route.params
export default function PlaceholderScreen({ title, iconName, route }) {
  const { t } = useTranslation();
  const displayTitle = title || route?.params?.title || t('common.screen');
  const displayIcon = iconName || route?.params?.iconName || 'apps-outline';

  return (
    <View style={styles.container}>
      <Ionicons name={displayIcon} size={64} color={COLORS.tabBarInactive} />
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.subtitle}>Раздел в разработке</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
