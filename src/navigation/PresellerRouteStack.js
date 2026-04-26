import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import RouteListScreen from '../screens/expeditor/RouteListScreen';
import RouteMapScreen from '../screens/expeditor/RouteMapScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import PresellerVisitScreen from '../screens/preseller/PresellerVisitScreen';
import OrderEditScreen from '../screens/orders/OrderEditScreen';
import OrderConfirmationScreen from '../screens/preseller/OrderConfirmationScreen';
import SignatureScreen from '../screens/expeditor/SignatureScreen';
import InvoiceSummaryScreen from '../screens/expeditor/InvoiceSummaryScreen';
import DocumentViewScreen from '../screens/expeditor/DocumentViewScreen';
import PrintPreviewScreen from '../screens/expeditor/PrintPreviewScreen';
import CustomerDetailScreen from '../screens/shared/CustomerDetailScreen';
import VisitReportScreen from '../screens/preseller/VisitReportScreen';
import StartOfDayScreen from '../screens/expeditor/StartOfDayScreen';
import EndOfDayScreen from '../screens/expeditor/EndOfDayScreen';
import ExpensesScreen from '../screens/expeditor/ExpensesScreen';
// Merchandising Audit screens — registered here (not as a separate tab) so they live
// in the same navigation tree as the visit flow that launches them.
import AuditScreen from '../modules/merchandising/screens/AuditScreen';
import QuestionScreen from '../modules/merchandising/screens/QuestionScreen';
import PhotoCaptureScreen from '../modules/merchandising/screens/PhotoCaptureScreen';
import AuditSummaryScreen from '../modules/merchandising/screens/AuditSummaryScreen';
import KpiResultScreen from '../modules/merchandising/screens/KpiResultScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600', color: COLORS.white },
};

export default function PresellerRouteStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen name={SCREEN_NAMES.ROUTE_LIST} component={RouteListScreen} options={{ title: i18n.t('nav.route') }} />
      <Stack.Screen name={SCREEN_NAMES.ROUTE_MAP} component={RouteMapScreen} options={{ title: i18n.t('nav.map') }} />
      <Stack.Screen name={SCREEN_NAMES.ORDERS_LIST} component={OrdersScreen} options={{ title: i18n.t('nav.orders') }} />
      <Stack.Screen name={SCREEN_NAMES.PRESELLER_VISIT} component={PresellerVisitScreen} options={{ title: i18n.t('nav.visit') }} />
      <Stack.Screen
        name={SCREEN_NAMES.ORDER_EDIT}
        component={OrderEditScreen}
        options={({ route }) => ({
          title: route.params?.readOnly ? i18n.t('nav.viewOrder') : route.params?.orderId ? i18n.t('nav.editOrder') : i18n.t('nav.newOrder'),
        })}
      />
      <Stack.Screen name={SCREEN_NAMES.ORDER_CONFIRMATION} component={OrderConfirmationScreen} options={{ title: i18n.t('nav.orderConfirmation') }} />
      <Stack.Screen name={SCREEN_NAMES.SIGNATURE} component={SignatureScreen} options={{ title: i18n.t('nav.signature') }} />
      <Stack.Screen name={SCREEN_NAMES.INVOICE_SUMMARY} component={InvoiceSummaryScreen} options={{ title: i18n.t('nav.invoiceSummary') }} />
      <Stack.Screen name={SCREEN_NAMES.DOCUMENT_VIEW} component={DocumentViewScreen} options={{ title: i18n.t('nav.documentView') }} />
      <Stack.Screen name={SCREEN_NAMES.PRINT_PREVIEW} component={PrintPreviewScreen} options={{ title: i18n.t('nav.printPreview') }} />
      <Stack.Screen name={SCREEN_NAMES.CUSTOMER_DETAIL} component={CustomerDetailScreen} options={{ title: i18n.t('nav.customerDetail') }} />
      <Stack.Screen name={SCREEN_NAMES.VISIT_REPORT} component={VisitReportScreen} options={{ title: i18n.t('nav.visitReport') }} />
      <Stack.Screen name={SCREEN_NAMES.START_OF_DAY} component={StartOfDayScreen} options={{ title: i18n.t('startOfDay.title') }} />
      <Stack.Screen name={SCREEN_NAMES.END_OF_DAY} component={EndOfDayScreen} options={{ title: i18n.t('endOfDay.title') }} />
      <Stack.Screen name={SCREEN_NAMES.EXPENSES} component={ExpensesScreen} options={{ title: i18n.t('nav.expenses') }} />
      {/* Merchandising Audit (gated by settingsStore.merchandisingEnabled) */}
      <Stack.Screen name={SCREEN_NAMES.MERCH_AUDIT} component={AuditScreen} options={{ title: i18n.t('merchAudit.nav.audit') }} />
      <Stack.Screen name={SCREEN_NAMES.MERCH_QUESTION} component={QuestionScreen} options={{ title: i18n.t('merchAudit.nav.question') }} />
      <Stack.Screen name={SCREEN_NAMES.MERCH_PHOTO_CAPTURE} component={PhotoCaptureScreen} options={{ title: i18n.t('merchAudit.nav.photo'), headerShown: false }} />
      <Stack.Screen name={SCREEN_NAMES.MERCH_AUDIT_SUMMARY} component={AuditSummaryScreen} options={{ title: i18n.t('merchAudit.nav.summary') }} />
      <Stack.Screen name={SCREEN_NAMES.MERCH_KPI_RESULT} component={KpiResultScreen} options={{ title: i18n.t('merchAudit.nav.result') }} />
    </Stack.Navigator>
  );
}
