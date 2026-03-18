import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import ExpeditorHomeScreen from '../screens/home/ExpeditorHomeScreen';
import RouteStack from './RouteStack';
import WarehouseOpsStack from './WarehouseOpsStack';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  [SCREEN_NAMES.EXPEDITOR_HOME]: {
    component: ExpeditorHomeScreen,
    get title() { return i18n.t('nav.home'); },
    focused: 'home',
    unfocused: 'home-outline',
  },
  [SCREEN_NAMES.ROUTE_TAB]: {
    component: RouteStack,
    get title() { return i18n.t('nav.route'); },
    focused: 'map',
    unfocused: 'map-outline',
    isStack: true,
    initialScreen: SCREEN_NAMES.ROUTE_LIST,
  },
  [SCREEN_NAMES.WAREHOUSE_OPS_TAB]: {
    component: WarehouseOpsStack,
    get title() { return i18n.t('nav.warehouse'); },
    focused: 'cube',
    unfocused: 'cube-outline',
    isStack: true,
    initialScreen: SCREEN_NAMES.INVENTORY_CHECK,
  },
  [SCREEN_NAMES.PROFILE_TAB]: {
    component: ProfileStack,
    get title() { return i18n.t('nav.profile'); },
    focused: 'person-circle',
    unfocused: 'person-circle-outline',
    isStack: true,
    initialScreen: SCREEN_NAMES.PROFILE,
  },
};

export default function ExpeditorTabs() {
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
          initialParams={cfg.params}
          options={{
            title: cfg.title,
            ...(cfg.isStack && { headerShown: false }),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              if (cfg.isStack) {
                navigation.navigate(name, { screen: cfg.initialScreen });
              }
            },
          })}
        />
      ))}
    </Tab.Navigator>
  );
}
