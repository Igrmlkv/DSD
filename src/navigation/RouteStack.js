import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import RouteListScreen from '../screens/expeditor/RouteListScreen';
import RouteMapScreen from '../screens/expeditor/RouteMapScreen';
import VisitScreen from '../screens/expeditor/VisitScreen';
import ShipmentScreen from '../screens/expeditor/ShipmentScreen';
import ReturnsScreen from '../screens/expeditor/ReturnsScreen';
import PackagingReturnsScreen from '../screens/expeditor/PackagingReturnsScreen';
import PaymentScreen from '../screens/expeditor/PaymentScreen';
import SignatureScreen from '../screens/expeditor/SignatureScreen';
import ScanningScreen from '../screens/expeditor/ScanningScreen';
import InvoiceSummaryScreen from '../screens/expeditor/InvoiceSummaryScreen';
import DocumentViewScreen from '../screens/expeditor/DocumentViewScreen';
import PrintPreviewScreen from '../screens/expeditor/PrintPreviewScreen';
import CustomerDetailScreen from '../screens/shared/CustomerDetailScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600', color: COLORS.white },
};

export default function RouteStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name={SCREEN_NAMES.ROUTE_LIST} component={RouteListScreen} options={{ title: i18n.t('nav.route') }} />
      <Stack.Screen name={SCREEN_NAMES.ROUTE_MAP} component={RouteMapScreen} options={{ title: i18n.t('nav.map') }} />
      <Stack.Screen name={SCREEN_NAMES.VISIT} component={VisitScreen} options={{ title: i18n.t('nav.visit') }} />
      <Stack.Screen name={SCREEN_NAMES.SHIPMENT} component={ShipmentScreen} options={{ title: i18n.t('nav.shipment') }} />
      <Stack.Screen name={SCREEN_NAMES.RETURNS} component={ReturnsScreen} options={{ title: i18n.t('nav.returns') }} />
      <Stack.Screen name={SCREEN_NAMES.PACKAGING_RETURNS} component={PackagingReturnsScreen} options={{ title: i18n.t('nav.packagingReturns') }} />
      <Stack.Screen name={SCREEN_NAMES.PAYMENT} component={PaymentScreen} options={{ title: i18n.t('nav.payment') }} />
      <Stack.Screen name={SCREEN_NAMES.SIGNATURE} component={SignatureScreen} options={{ title: i18n.t('nav.signature') }} />
      <Stack.Screen name={SCREEN_NAMES.SCANNING} component={ScanningScreen} options={{ title: i18n.t('nav.scanning') }} />
      <Stack.Screen name={SCREEN_NAMES.INVOICE_SUMMARY} component={InvoiceSummaryScreen} options={{ title: i18n.t('nav.invoiceSummary') }} />
      <Stack.Screen name={SCREEN_NAMES.DOCUMENT_VIEW} component={DocumentViewScreen} options={{ title: i18n.t('nav.documentView') }} />
      <Stack.Screen name={SCREEN_NAMES.PRINT_PREVIEW} component={PrintPreviewScreen} options={{ title: i18n.t('nav.printPreview') }} />
      <Stack.Screen name={SCREEN_NAMES.CUSTOMER_DETAIL} component={CustomerDetailScreen} options={{ title: i18n.t('nav.customerDetail') }} />
    </Stack.Navigator>
  );
}
