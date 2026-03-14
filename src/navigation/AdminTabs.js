import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import AdminHomeScreen from '../screens/home/AdminHomeScreen';
import UsersStack from './UsersStack';
import DeviceManagementScreen from '../screens/admin/DeviceManagementScreen';
import SyncStack from './SyncStack';
import SystemSettingsScreen from '../screens/admin/SystemSettingsScreen';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  [SCREEN_NAMES.ADMIN_HOME]: {
    component: AdminHomeScreen,
    get title() { return i18n.t('nav.home'); },
    focused: 'home',
    unfocused: 'home-outline',
  },
  [SCREEN_NAMES.USERS_TAB]: {
    component: UsersStack,
    get title() { return i18n.t('nav.users'); },
    focused: 'people',
    unfocused: 'people-outline',
    isStack: true,
  },
  [SCREEN_NAMES.DEVICES_TAB]: {
    component: DeviceManagementScreen,
    get title() { return i18n.t('nav.devices'); },
    focused: 'phone-portrait',
    unfocused: 'phone-portrait-outline',
  },
  [SCREEN_NAMES.SYNC_TAB]: {
    component: SyncStack,
    get title() { return i18n.t('nav.sync'); },
    focused: 'sync',
    unfocused: 'sync-outline',
    isStack: true,
  },
  [SCREEN_NAMES.SETTINGS_TAB]: {
    component: SystemSettingsScreen,
    get title() { return i18n.t('nav.settings'); },
    focused: 'settings',
    unfocused: 'settings-outline',
  },
};

export default function AdminTabs() {
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
