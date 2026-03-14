import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import MonitoringMapScreen from '../screens/supervisor/MonitoringMapScreen';
import ExpeditorRouteDetailScreen from '../screens/supervisor/ExpeditorRouteDetailScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600', color: COLORS.white },
};

export default function MonitoringStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={SCREEN_NAMES.MONITORING_MAP}
        component={MonitoringMapScreen}
        options={{ title: i18n.t('nav.monitoring') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.EXPEDITOR_ROUTE_DETAIL}
        component={ExpeditorRouteDetailScreen}
        options={{ title: i18n.t('nav.expeditorRoute') }}
      />
    </Stack.Navigator>
  );
}
