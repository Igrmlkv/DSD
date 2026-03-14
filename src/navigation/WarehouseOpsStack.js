import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import LoadingTripScreen from '../screens/expeditor/LoadingTripScreen';
import InventoryCheckScreen from '../screens/expeditor/InventoryCheckScreen';
import CashCollectionScreen from '../screens/expeditor/CashCollectionScreen';
import VehicleUnloadingScreen from '../screens/expeditor/VehicleUnloadingScreen';
import StartOfDayScreen from '../screens/expeditor/StartOfDayScreen';
import EndOfDayScreen from '../screens/expeditor/EndOfDayScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600', color: COLORS.white },
};

export default function WarehouseOpsStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name={SCREEN_NAMES.INVENTORY_CHECK} component={InventoryCheckScreen} options={{ title: i18n.t('nav.inventoryCheck') }} />
      <Stack.Screen name={SCREEN_NAMES.START_OF_DAY} component={StartOfDayScreen} options={{ title: i18n.t('startOfDay.title') }} />
      <Stack.Screen name={SCREEN_NAMES.LOADING_TRIP} component={LoadingTripScreen} options={{ title: i18n.t('nav.loadingTrip') }} />
      <Stack.Screen name={SCREEN_NAMES.CASH_COLLECTION} component={CashCollectionScreen} options={{ title: i18n.t('nav.cashCollection') }} />
      <Stack.Screen name={SCREEN_NAMES.VEHICLE_UNLOADING} component={VehicleUnloadingScreen} options={{ title: i18n.t('nav.vehicleUnloading') }} />
      <Stack.Screen name={SCREEN_NAMES.END_OF_DAY} component={EndOfDayScreen} options={{ title: i18n.t('endOfDay.title') }} />
    </Stack.Navigator>
  );
}
