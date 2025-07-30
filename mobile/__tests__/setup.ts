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
  var window: any;
  var document: any;
  var location: any;
  var navigator: any;
}

// Mock browser globals for tests that need them
const mockLocalStorage = new Map<string, string>();

global.window = {
  localStorage: {
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
  },
  location: {
    href: 'http://localhost:3000/mobile',
    pathname: '/mobile',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  history: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    back: vi.fn(),
  },
  alert: vi.fn(),
  confirm: vi.fn(() => true),
};

global.document = {
  createElement: vi.fn(() => ({
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

global.navigator = {
  userAgent: 'Mozilla/5.0 (Mobile; Mobile Test)',
  platform: 'Mobile',
};

global.location = global.window.location;

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