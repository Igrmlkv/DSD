import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import RoutesScreen from '../screens/routes/RoutesScreen';
import DeliveryScreen from '../screens/delivery/DeliveryScreen';
import OrdersStack from './OrdersStack';
import WarehouseScreen from '../screens/warehouse/WarehouseScreen';
import FinanceScreen from '../screens/finance/FinanceScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import { getAllowedTabs } from '../constants/roles';
import useAuthStore from '../store/authStore';
import i18n from '../i18n';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  [SCREEN_NAMES.ROUTES]: { component: RoutesScreen, get title() { return i18n.t('nav.routes'); }, focused: 'map', unfocused: 'map-outline' },
  [SCREEN_NAMES.DELIVERY]: { component: DeliveryScreen, get title() { return i18n.t('nav.customers'); }, focused: 'people', unfocused: 'people-outline' },
  [SCREEN_NAMES.ORDERS]: { component: OrdersStack, get title() { return i18n.t('nav.orders'); }, focused: 'document-text', unfocused: 'document-text-outline' },
  [SCREEN_NAMES.WAREHOUSE]: { component: WarehouseScreen, get title() { return i18n.t('nav.warehouse'); }, focused: 'cube', unfocused: 'cube-outline' },
  [SCREEN_NAMES.FINANCE]: { component: FinanceScreen, get title() { return i18n.t('nav.finance'); }, focused: 'wallet', unfocused: 'wallet-outline' },
  [SCREEN_NAMES.PROFILE]: { component: ProfileScreen, get title() { return i18n.t('nav.profile'); }, focused: 'person-circle', unfocused: 'person-circle-outline' },
};

export default function MainTabs() {
  const role = useAuthStore((state) => state.user?.role);
  const allowedTabs = getAllowedTabs(role);

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
      {allowedTabs.map((name) => {
        const cfg = TAB_CONFIG[name];
        const isStack = name === SCREEN_NAMES.ORDERS;
        return (
          <Tab.Screen
            key={name}
            name={name}
            component={cfg.component}
            options={{ title: cfg.title, ...(isStack && { headerShown: false }) }}
          />
        );
      })}
    </Tab.Navigator>
  );
}
