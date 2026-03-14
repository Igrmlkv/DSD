import { SCREEN_NAMES } from './screens';
import i18n from '../i18n';

// 3 роли согласно DSD_Mobile_App.md v1.1
export const ROLES = {
  expeditor: {
    key: 'expeditor',
    get label() { return i18n.t('roles.expeditor'); },
    get description() { return i18n.t('roles.expeditorDesc'); },
    icon: 'car',
    tabs: [
      SCREEN_NAMES.EXPEDITOR_HOME,
      SCREEN_NAMES.ROUTE_TAB,
      SCREEN_NAMES.WAREHOUSE_OPS_TAB,
      SCREEN_NAMES.PROFILE_TAB,
    ],
  },
  supervisor: {
    key: 'supervisor',
    get label() { return i18n.t('roles.supervisor'); },
    get description() { return i18n.t('roles.supervisorDesc'); },
    icon: 'eye',
    tabs: [
      SCREEN_NAMES.SUPERVISOR_HOME,
      SCREEN_NAMES.MONITORING_TAB,
      SCREEN_NAMES.RETURNS_APPROVAL_TAB,
      SCREEN_NAMES.ANALYTICS_TAB,
      SCREEN_NAMES.PROFILE_TAB,
    ],
  },
  admin: {
    key: 'admin',
    get label() { return i18n.t('roles.admin'); },
    get description() { return i18n.t('roles.adminDesc'); },
    icon: 'settings',
    tabs: [
      SCREEN_NAMES.ADMIN_HOME,
      SCREEN_NAMES.USERS_TAB,
      SCREEN_NAMES.DEVICES_TAB,
      SCREEN_NAMES.SYNC_TAB,
      SCREEN_NAMES.SETTINGS_TAB,
    ],
  },
};

export function getRoleConfig(roleKey) {
  return ROLES[roleKey] || ROLES.expeditor;
}

export function getAllowedTabs(roleKey) {
  return getRoleConfig(roleKey).tabs;
}
