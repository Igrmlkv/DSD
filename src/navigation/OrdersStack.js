import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrdersScreen from '../screens/orders/OrdersScreen';
import OrderEditScreen from '../screens/orders/OrderEditScreen';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';

const Stack = createNativeStackNavigator();

export default function OrdersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name={SCREEN_NAMES.ORDERS_LIST}
        component={OrdersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.ORDER_EDIT}
        component={OrderEditScreen}
        options={({ route }) => ({
          title: route.params?.readOnly ? i18n.t('nav.viewOrder') : route.params?.orderId ? i18n.t('nav.editOrder') : i18n.t('nav.newOrder'),
        })}
      />
    </Stack.Navigator>
  );
}
