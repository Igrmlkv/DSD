import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import SyncMonitoringScreen from '../screens/admin/SyncMonitoringScreen';
import ConflictResolutionScreen from '../screens/admin/ConflictResolutionScreen';
import AuditLogScreen from '../screens/admin/AuditLogScreen';
import ErrorLogScreen from '../screens/admin/ErrorLogScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600', color: COLORS.white },
};

export default function SyncStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={SCREEN_NAMES.SYNC_MONITORING}
        component={SyncMonitoringScreen}
        options={{ title: i18n.t('nav.sync') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.CONFLICT_RESOLUTION}
        component={ConflictResolutionScreen}
        options={{ title: i18n.t('nav.conflicts') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.AUDIT_LOG}
        component={AuditLogScreen}
        options={{ title: i18n.t('nav.audit') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.ERROR_LOG}
        component={ErrorLogScreen}
        options={{ title: i18n.t('nav.errorLog') }}
      />
    </Stack.Navigator>
  );
}
