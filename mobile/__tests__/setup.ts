import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// React Native testing setup
// Mock react-native modules for testing environment
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: vi.fn() },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 667 })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  Alert: {
    alert: vi.fn(),
  },
  Linking: {
    openURL: vi.fn(),
    canOpenURL: vi.fn(() => Promise.resolve(true)),
  },
  StatusBar: {
    setBarStyle: vi.fn(),
  },
  // Mock common React Native components
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  ScrollView: 'ScrollView',
  Image: 'Image',
  StyleSheet: {
    create: vi.fn((styles) => styles),
  },
}));

// Mock @react-native-async-storage/async-storage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

// Mock Expo modules
vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

vi.mock('expo-linking', () => ({
  openURL: vi.fn(),
  canOpenURL: vi.fn(() => Promise.resolve(true)),
}));

// Mock React Native Screens
vi.mock('react-native-screens', () => ({
  enableScreens: vi.fn(),
}));

// Mock React Native Safe Area Context
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock AsyncStorage for React Native with proper implementation
const mockAsyncStorage = new Map<string, string>();

// Extend global object to avoid TypeScript errors
declare global {
  var AsyncStorage: any;
  var expo: any;
  var ReactNative: any;
}

// Mock browser globals for tests that need them
const mockLocalStorage = new Map<string, string>();

/**
 * The following browser globals (window, document, location, navigator) are provided by jsdom in Vitest.
 * Overwriting them can cause issues and is unnecessary unless you need to patch specific properties.
 * Only patch what is required for your tests.
 */

/**
 * Ensure window exists for environments where it may be undefined (e.g., Node.js).
 */
if (typeof window === 'undefined') {
  (global as any).window = {};
}
// Patch window.localStorage if needed
if (typeof window !== 'undefined') {
  window.localStorage = {
    getItem: vi.fn((key: string) => mockLocalStorage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      mockLocalStorage.delete(key);
    }),
    clear: vi.fn(() => {
      mockLocalStorage.clear();
    }),
  } as any;
}
if (typeof global !== 'undefined') {
  (global as any).localStorage = (typeof window !== 'undefined' ? window.localStorage : {
    getItem: vi.fn((key: string) => mockLocalStorage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => {
      mockLocalStorage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      mockLocalStorage.delete(key);
    }),
    clear: vi.fn(() => {
      mockLocalStorage.clear();
    }),
  });
}

// Patch window.alert and window.confirm if needed
if (typeof window !== 'undefined') {
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
}

// Patch window.location if your tests depend on it
if (typeof window !== 'undefined' && window.location) {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000/mobile',
      pathname: '/mobile',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}

// Patch window.history if needed
if (typeof window !== 'undefined') {
  if (typeof window.history === 'undefined') {
    window.history = {
      length: 0,
      scrollRestoration: 'auto',
      state: null,
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      pushState: vi.fn(),
      replaceState: vi.fn(),
    } as History;
  } else {
    window.history.pushState = vi.fn();
    window.history.replaceState = vi.fn();
    window.history.back = vi.fn();
  }
}

// Patch navigator properties if needed
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Mobile; Mobile Test)',
    configurable: true,
  });
  Object.defineProperty(navigator, 'platform', {
    value: 'Mobile',
    configurable: true,
  });
}

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
/**
 * Only assign global.expo if your tests require it.
 */
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
/**
 * Only assign global.ReactNative if your tests require it.
 */
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