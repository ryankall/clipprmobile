import { beforeAll, afterEach, afterAll, vi } from 'vitest';
// import { cleanup } from '@testing-library/react-native';
// import { server } from './mocks/server';

// Mock AsyncStorage for React Native
global.AsyncStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  multiSet: vi.fn(),
  multiRemove: vi.fn(),
};

// Mock Expo modules
global.expo = {
  Constants: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3000/api',
      },
    },
  },
  Router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
  Notifications: {
    requestPermissionsAsync: vi.fn(),
    getPermissionsAsync: vi.fn(),
    scheduleNotificationAsync: vi.fn(),
    cancelNotificationAsync: vi.fn(),
  },
};

// Mock React Native components
global.ReactNative = {
  Platform: { OS: 'ios' },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 667 })),
  },
  PanGestureHandler: vi.fn(),
  State: { ACTIVE: 4, END: 5 },
};

// Establish API mocking before all tests (if needed)
// beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests
afterEach(() => {
  // server.resetHandlers();
  // cleanup();
  vi.clearAllMocks();
});

// Clean up after the tests are finished
// afterAll(() => server.close());