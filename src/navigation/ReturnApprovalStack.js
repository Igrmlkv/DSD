import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import ReturnApprovalScreen from '../screens/supervisor/ReturnApprovalScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600', color: COLORS.white },
};

export default function ReturnApprovalStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={SCREEN_NAMES.RETURN_APPROVAL_LIST}
        component={ReturnApprovalScreen}
        options={{ title: i18n.t('nav.returns') }}
      />
    </Stack.Navigator>
  );
}
