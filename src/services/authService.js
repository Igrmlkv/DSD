import { saveTokens, saveUserData, clearAll } from './secureStorage';

// 4 тестовых аккаунта согласно DSD_Mobile_App.md v1.1
// 3 роли: expeditor, supervisor, admin
const MOCK_USERS = {
  petrov: {
    password: '1',
    user: {
      id: 'usr-001',
      username: 'petrov',
      fullName: 'Петров Алексей Иванович',
      role: 'expeditor',
      phone: '+79161234567',
      vehicleId: 'veh-001',
      vehiclePlate: 'А123БВ77',
      vehicleModel: 'ГАЗель Next',
    },
  },
  kozlov: {
    password: '1',
    user: {
      id: 'usr-003',
      username: 'kozlov',
      fullName: 'Козлов Дмитрий Сергеевич',
      role: 'expeditor',
      phone: '+79031112233',
      vehicleId: 'veh-002',
      vehiclePlate: 'К456МН77',
      vehicleModel: 'ГАЗель Business',
    },
  },
  ivanova: {
    password: '1',
    user: {
      id: 'usr-004',
      username: 'ivanova',
      fullName: 'Иванова Елена Николаевна',
      role: 'supervisor',
      phone: '+79057778899',
    },
  },
  admin: {
    password: '1',
    user: {
      id: 'usr-006',
      username: 'admin',
      fullName: 'Администратор Системы',
      role: 'admin',
      phone: '+79990001122',
    },
  },
};

export const TEST_ACCOUNTS = Object.values(MOCK_USERS).map((m) => ({
  username: m.user.username,
  role: m.user.role,
  fullName: m.user.fullName,
}));

export async function login(username, password) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const mockUser = MOCK_USERS[username];

  if (!mockUser || mockUser.password !== password) {
    throw new Error('errorInvalid');
  }

  const accessToken = 'mock_access_' + Date.now();
  const refreshToken = 'mock_refresh_' + Date.now();

  await saveTokens(accessToken, refreshToken);
  await saveUserData(mockUser.user);

  return {
    user: mockUser.user,
    accessToken,
    refreshToken,
  };
}

export async function logout() {
  await clearAll();
}
