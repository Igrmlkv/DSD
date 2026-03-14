import React from 'react';
import useAuthStore from '../store/authStore';
import ExpeditorTabs from './ExpeditorTabs';
import SupervisorTabs from './SupervisorTabs';
import AdminTabs from './AdminTabs';

export default function RoleNavigator() {
  const role = useAuthStore((state) => state.user?.role);

  switch (role) {
    case 'supervisor':
      return <SupervisorTabs />;
    case 'admin':
      return <AdminTabs />;
    case 'expeditor':
    default:
      return <ExpeditorTabs />;
  }
}
