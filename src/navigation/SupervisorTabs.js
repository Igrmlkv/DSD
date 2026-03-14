import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import SupervisorHomeScreen from '../screens/home/SupervisorHomeScreen';
import MonitoringStack from './MonitoringStack';
import ReturnApprovalStack from './ReturnApprovalStack';
import AnalyticsReportsScreen from '../screens/supervisor/AnalyticsReportsScreen';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  [SCREEN_NAMES.SUPERVISOR_HOME]: {
    component: SupervisorHomeScreen,
    get title() { return i18n.t('nav.home'); },
    focused: 'home',
    unfocused: 'home-outline',
  },
  [SCREEN_NAMES.MONITORING_TAB]: {
    component: MonitoringStack,
    get title() { return i18n.t('nav.monitoring'); },
    focused: 'location',
    unfocused: 'location-outline',
    isStack: true,
  },
  [SCREEN_NAMES.RETURNS_APPROVAL_TAB]: {
    component: ReturnApprovalStack,
    get title() { return i18n.t('nav.returns'); },
    focused: 'return-down-back',
    unfocused: 'return-down-back-outline',
    isStack: true,
  },
  [SCREEN_NAMES.ANALYTICS_TAB]: {
    component: AnalyticsReportsScreen,
    get title() { return i18n.t('nav.analytics'); },
    focused: 'bar-chart',
    unfocused: 'bar-chart-outline',
  },
  [SCREEN_NAMES.PROFILE_TAB]: {
    component: ProfileStack,
    get title() { return i18n.t('nav.profile'); },
    focused: 'person-circle',
    unfocused: 'person-circle-outline',
    isStack: true,
  },
};

export default function SupervisorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const cfg = TAB_CONFIG[route.name];
          const iconName = focused ? cfg.focused : cfg.unfocused;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.tabBarActive,
        tabBarInactiveTintColor: COLORS.tabBarInactive,
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600', color: COLORS.white },
        tabBarLabelStyle: { fontSize: 10 },
      })}
    >
      {Object.entries(TAB_CONFIG).map(([name, cfg]) => (
        <Tab.Screen
          key={name}
          name={name}
          component={cfg.component}
          options={{
            title: cfg.title,
            ...(cfg.isStack && { headerShown: false }),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
