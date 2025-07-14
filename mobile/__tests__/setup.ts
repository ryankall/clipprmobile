import { beforeAll, afterEach, afterAll, vi } from 'vitest';
// import { cleanup } from '@testing-library/react-native';
// import { server } from './mocks/server';

// Mock AsyncStorage for React Native with proper implementation
const mockAsyncStorage = new Map<string, string>();

global.AsyncStorage = {
  setItem: vi.fn((key: string, value: string) => {
    mockAsyncStorage.set(key, value);
    return Promise.resolve();
  }),
  getItem: vi.fn((key: string) => {
    return Promise.resolve(mockAsyncStorage.get(key) || null);
  }),
  removeItem: vi.fn((key: string) => {
    mockAsyncStorage.delete(key);
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    mockAsyncStorage.clear();
    return Promise.resolve();
  }),
  multiSet: vi.fn((keyValuePairs: [string, string][]) => {
    keyValuePairs.forEach(([key, value]) => mockAsyncStorage.set(key, value));
    return Promise.resolve();
  }),
  multiRemove: vi.fn((keys: string[]) => {
    keys.forEach(key => mockAsyncStorage.delete(key));
    return Promise.resolve();
  }),
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
  mockAsyncStorage.clear(); // Clear AsyncStorage between tests
});

// Clean up after the tests are finished
// afterAll(() => server.close());