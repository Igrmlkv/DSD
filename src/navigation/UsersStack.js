import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SCREEN_NAMES } from '../constants/screens';
import { COLORS } from '../constants/colors';
import i18n from '../i18n';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import UserEditScreen from '../screens/admin/UserEditScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: COLORS.white,
  headerTitleStyle: { fontWeight: '600', color: COLORS.white },
};

export default function UsersStack() {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={SCREEN_NAMES.USER_MANAGEMENT}
        component={UserManagementScreen}
        options={{ title: i18n.t('nav.users') }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.USER_EDIT}
        component={UserEditScreen}
        options={({ route }) => ({
          title: route.params?.userId ? i18n.t('nav.editUser') : i18n.t('nav.newUser'),
        })}
      />
    </Stack.Navigator>
  );
}
