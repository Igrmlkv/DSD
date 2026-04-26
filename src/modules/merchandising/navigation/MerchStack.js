import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SCREEN_NAMES } from '../../../constants/screens';
import { COLORS } from '../../../constants/colors';
import AuditListScreen from '../screens/AuditListScreen';
import AuditScreen from '../screens/AuditScreen';
import QuestionScreen from '../screens/QuestionScreen';
import PhotoCaptureScreen from '../screens/PhotoCaptureScreen';
import AuditSummaryScreen from '../screens/AuditSummaryScreen';
import KpiResultScreen from '../screens/KpiResultScreen';

const Stack = createNativeStackNavigator();

export default function MerchStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600', color: COLORS.white },
      }}
    >
      <Stack.Screen
        name={SCREEN_NAMES.MERCH_AUDIT_LIST}
        component={AuditListScreen}
        options={{ title: t('merchAudit.nav.list') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.MERCH_AUDIT}
        component={AuditScreen}
        options={{ title: t('merchAudit.nav.audit') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.MERCH_QUESTION}
        component={QuestionScreen}
        options={{ title: t('merchAudit.nav.question') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.MERCH_PHOTO_CAPTURE}
        component={PhotoCaptureScreen}
        options={{ title: t('merchAudit.nav.photo'), headerShown: false }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.MERCH_AUDIT_SUMMARY}
        component={AuditSummaryScreen}
        options={{ title: t('merchAudit.nav.summary') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.MERCH_KPI_RESULT}
        component={KpiResultScreen}
        options={{ title: t('merchAudit.nav.result') }}
      />
    </Stack.Navigator>
  );
}
