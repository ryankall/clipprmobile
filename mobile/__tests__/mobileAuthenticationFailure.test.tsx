import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mobile authentication failure interfaces
interface MobileAuthFailureScenario {
  name: string;
  responseStatus: number;
  responseBody: string;
  expectedError: string;
  shouldRedirect: boolean;
  shouldClearToken: boolean;
  shouldShowToast: boolean;
  mobileSpecific?: {
    shouldTriggerHapticFeedback: boolean;
    shouldShowBanner: boolean;
  };
}

interface MobileUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  deviceTokens: string[];
  lastActiveDevice: string;
}

interface MobileAuthResponse {
  user: MobileUser;
  token: string;
  refreshToken: string;
  expiresIn: number;
  message: string;
}

// Mobile authentication service with device token support
class MobileAuthService {
  private users: MobileUser[] = [];
  private validTokens: Set<string> = new Set();
  private refreshTokens: Map<string, string> = new Map();
  private deviceTokens: Map<string, string[]> = new Map();

  constructor() {
    this.setupMockUsers();
  }

  private setupMockUsers(): void {
    this.users = [
      {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '6467891234',
        deviceTokens: ['device_token_1', 'device_token_2'],
        lastActiveDevice: 'iPhone 14 Pro',
      },
      {
        id: 2,
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '6467895678',
        deviceTokens: ['device_token_3'],
        lastActiveDevice: 'Samsung Galaxy S23',
      },
    ];

    // Setup valid tokens
    this.validTokens.add('valid_token_123');
    this.validTokens.add('valid_token_456');
    
    // Setup refresh tokens
    this.refreshTokens.set('valid_token_123', 'refresh_token_123');
    this.refreshTokens.set('valid_token_456', 'refresh_token_456');
  }

  async authenticateUser(email: string, password: string, deviceToken?: string): Promise<MobileAuthResponse> {
    const user = this.users.find(u => u.email === email);
    
    if (!user || password !== 'correct_password') {
      throw new Error('Invalid credentials');
    }

    const token = `mobile_token_${Date.now()}`;
    const refreshToken = `mobile_refresh_${Date.now()}`;
    
    this.validTokens.add(token);
    this.refreshTokens.set(token, refreshToken);
    
    if (deviceToken) {
      if (!this.deviceTokens.has(user.id.toString())) {
        this.deviceTokens.set(user.id.toString(), []);
      }
      this.deviceTokens.get(user.id.toString())?.push(deviceToken);
    }

    return {
      user,
      token,
      refreshToken,
      expiresIn: 3600, // 1 hour
      message: 'Authentication successful',
    };
  }

  async validateToken(token: string): Promise<MobileUser | null> {
    if (!this.validTokens.has(token)) {
      return null;
    }

    const userId = token.includes('valid_token_123') ? 1 : 2;
    return this.users.find(u => u.id === userId) || null;
  }

  async refreshToken(refreshToken: string): Promise<MobileAuthResponse | null> {
    const tokenEntry = Array.from(this.refreshTokens.entries()).find(
      ([_, rToken]) => rToken === refreshToken
    );

    if (!tokenEntry) {
      return null;
    }

    const [oldToken] = tokenEntry;
    const user = await this.validateToken(oldToken);
    
    if (!user) {
      return null;
    }

    // Generate new tokens
    const newToken = `mobile_token_${Date.now()}`;
    const newRefreshToken = `mobile_refresh_${Date.now()}`;
    
    // Remove old tokens
    this.validTokens.delete(oldToken);
    this.refreshTokens.delete(oldToken);
    
    // Add new tokens
    this.validTokens.add(newToken);
    this.refreshTokens.set(newToken, newRefreshToken);

    return {
      user,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
      message: 'Token refreshed successfully',
    };
  }

  invalidateToken(token: string): void {
    this.validTokens.delete(token);
    this.refreshTokens.delete(token);
  }

  expireToken(token: string): void {
    this.validTokens.delete(token);
  }

  async revokeDeviceToken(userId: number, deviceToken: string): Promise<void> {
    const tokens = this.deviceTokens.get(userId.toString()) || [];
    const updatedTokens = tokens.filter(t => t !== deviceToken);
    this.deviceTokens.set(userId.toString(), updatedTokens);
  }

  getDeviceTokens(userId: number): string[] {
    return this.deviceTokens.get(userId.toString()) || [];
  }
}

// Mobile API handler with React Native networking
class MobileApiHandler {
  private authService: MobileAuthService;
  private networkInfo: any;

  constructor() {
    this.authService = new MobileAuthService();
    this.networkInfo = {
      isConnected: true,
      type: 'cellular',
      isWifiEnabled: true,
    };
  }

  async handleRequest(method: string, url: string, options: any = {}): Promise<Response> {
    // Simulate network connectivity check
    if (!this.networkInfo.isConnected) {
      throw new Error('Network request failed - No internet connection');
    }

    // Simulate different authentication failures
    if (url === '/api/auth/user' && !options.headers?.Authorization) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401 }
      );
    }

    if (url === '/api/auth/user' && options.headers?.Authorization === 'Bearer expired_token') {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 401 }
      );
    }

    if (url === '/api/auth/user' && options.headers?.Authorization === 'Bearer invalid_token') {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401 }
      );
    }

    if (url === '/api/auth/login' && method === 'POST') {
      try {
        const { email, password, deviceToken } = JSON.parse(options.body);
        const response = await this.authService.authenticateUser(email, password, deviceToken);
        return new Response(JSON.stringify(response), { status: 200 });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: (error as Error).message }),
          { status: 401 }
        );
      }
    }

    if (url === '/api/auth/refresh' && method === 'POST') {
      try {
        const { refreshToken } = JSON.parse(options.body);
        const response = await this.authService.refreshToken(refreshToken);
        
        if (!response) {
          return new Response(
            JSON.stringify({ error: 'Invalid refresh token' }),
            { status: 401 }
          );
        }
        
        return new Response(JSON.stringify(response), { status: 200 });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Token refresh failed' }),
          { status: 401 }
        );
      }
    }

    // Default success response
    return new Response(
      JSON.stringify({ message: 'Success' }),
      { status: 200 }
    );
  }

  setNetworkInfo(info: any): void {
    this.networkInfo = info;
  }

  getAuthService(): MobileAuthService {
    return this.authService;
  }
}

// Mobile authentication failure handler with React Native specifics
class MobileAuthFailureHandler {
  private asyncStorage: typeof AsyncStorage;
  private queryClient: QueryClient;
  private router: any;
  private hapticFeedback: any;
  private toastService: any;

  constructor(
    asyncStorage: typeof AsyncStorage,
    queryClient: QueryClient,
    router: any,
    hapticFeedback: any,
    toastService: any
  ) {
    this.asyncStorage = asyncStorage;
    this.queryClient = queryClient;
    this.router = router;
    this.hapticFeedback = hapticFeedback;
    this.toastService = toastService;
  }

  async handleAuthFailure(error: any): Promise<void> {
    // Clear stored tokens
    await this.asyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    
    // Clear React Query cache
    this.queryClient.clear();
    
    // Trigger haptic feedback on mobile
    if (this.hapticFeedback) {
      this.hapticFeedback.impactAsync(this.hapticFeedback.ImpactFeedbackStyle.Medium);
    }
    
    // Show toast notification
    if (this.toastService) {
      this.toastService.show({
        type: 'error',
        title: 'Authentication Failed',
        message: 'Please sign in again',
        duration: 3000,
      });
    }
    
    // Navigate to login screen
    this.router.replace('/auth');
  }

  async makeAuthenticatedRequest(url: string, options: any = {}): Promise<any> {
    const token = await this.asyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Try to refresh token
      const refreshToken = await this.asyncStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            await this.asyncStorage.setItem('token', refreshData.token);
            await this.asyncStorage.setItem('refreshToken', refreshData.refreshToken);
            
            // Retry original request
            return this.makeAuthenticatedRequest(url, options);
          }
        } catch (refreshError) {
          // Refresh failed, handle auth failure
          await this.handleAuthFailure(refreshError);
          throw refreshError;
        }
      }
      
      // No refresh token or refresh failed
      await this.handleAuthFailure(new Error('Authentication failed'));
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }
}

// Test wrapper for mobile authentication
const MobileAuthTestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Mobile Authentication Failure Handling', () => {
  let mockApiHandler: MobileApiHandler;
  let mockAuthFailureHandler: MobileAuthFailureHandler;
  let authService: MobileAuthService;
  let queryClient: QueryClient;
  let mockRouter: any;
  let mockHapticFeedback: any;
  let mockToastService: any;

  beforeEach(() => {
    // Setup mocks
    mockApiHandler = new MobileApiHandler();
    authService = mockApiHandler.getAuthService();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    
    mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    };
    
    mockHapticFeedback = {
      impactAsync: vi.fn(),
      ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
      },
    };
    
    mockToastService = {
      show: vi.fn(),
      hide: vi.fn(),
    };
    
    mockAuthFailureHandler = new MobileAuthFailureHandler(
      AsyncStorage,
      queryClient,
      mockRouter,
      mockHapticFeedback,
      mockToastService
    );
    
    // Clear AsyncStorage before each test
    vi.clearAllMocks();
  });

  describe('Mobile Authentication Failure Detection', () => {
    const failureScenarios: MobileAuthFailureScenario[] = [
      {
        name: 'Token Expired',
        responseStatus: 401,
        responseBody: '{"error": "Token expired"}',
        expectedError: 'Token expired',
        shouldRedirect: true,
        shouldClearToken: true,
        shouldShowToast: true,
        mobileSpecific: {
          shouldTriggerHapticFeedback: true,
          shouldShowBanner: false,
        },
      },
      {
        name: 'Invalid Token',
        responseStatus: 401,
        responseBody: '{"error": "Invalid token"}',
        expectedError: 'Invalid token',
        shouldRedirect: true,
        shouldClearToken: true,
        shouldShowToast: true,
        mobileSpecific: {
          shouldTriggerHapticFeedback: true,
          shouldShowBanner: false,
        },
      },
      {
        name: 'Authentication Required',
        responseStatus: 401,
        responseBody: '{"error": "Authentication required"}',
        expectedError: 'Authentication required',
        shouldRedirect: true,
        shouldClearToken: true,
        shouldShowToast: true,
        mobileSpecific: {
          shouldTriggerHapticFeedback: true,
          shouldShowBanner: false,
        },
      },
    ];

    failureScenarios.forEach((scenario) => {
      it(`should handle ${scenario.name} correctly on mobile`, async () => {
        // Setup AsyncStorage with mock token
        await AsyncStorage.setItem('token', 'test_token');
        await AsyncStorage.setItem('refreshToken', 'test_refresh_token');
        await AsyncStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));

        const error = new Error(scenario.expectedError);
        
        await mockAuthFailureHandler.handleAuthFailure(error);

        // Verify tokens were cleared
        const token = await AsyncStorage.getItem('token');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const user = await AsyncStorage.getItem('user');
        
        expect(token).toBeNull();
        expect(refreshToken).toBeNull();
        expect(user).toBeNull();

        // Verify mobile-specific behaviors
        if (scenario.mobileSpecific?.shouldTriggerHapticFeedback) {
          expect(mockHapticFeedback.impactAsync).toHaveBeenCalledWith(
            mockHapticFeedback.ImpactFeedbackStyle.Medium
          );
        }

        if (scenario.shouldShowToast) {
          expect(mockToastService.show).toHaveBeenCalledWith({
            type: 'error',
            title: 'Authentication Failed',
            message: 'Please sign in again',
            duration: 3000,
          });
        }

        if (scenario.shouldRedirect) {
          expect(mockRouter.replace).toHaveBeenCalledWith('/auth');
        }
      });
    });
  });

  describe('Mobile Token Refresh', () => {
    it('should attempt token refresh on mobile before failing', async () => {
      // Setup AsyncStorage with valid tokens
      await AsyncStorage.setItem('token', 'expired_token');
      await AsyncStorage.setItem('refreshToken', 'valid_refresh_token');

      // Mock successful refresh
      const mockRefreshResponse = {
        token: 'new_token',
        refreshToken: 'new_refresh_token',
        user: { id: 1, email: 'test@example.com' },
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRefreshResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        });

      const result = await mockAuthFailureHandler.makeAuthenticatedRequest('/api/test');

      expect(result).toEqual({ data: 'success' });
      
      // Verify new tokens were stored
      const newToken = await AsyncStorage.getItem('token');
      const newRefreshToken = await AsyncStorage.getItem('refreshToken');
      
      expect(newToken).toBe('new_token');
      expect(newRefreshToken).toBe('new_refresh_token');
    });

    it('should handle failed token refresh on mobile', async () => {
      // Setup AsyncStorage with expired refresh token
      await AsyncStorage.setItem('token', 'expired_token');
      await AsyncStorage.setItem('refreshToken', 'expired_refresh_token');

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
        })
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
        });

      await expect(
        mockAuthFailureHandler.makeAuthenticatedRequest('/api/test')
      ).rejects.toThrow('Authentication failed');

      // Verify tokens were cleared
      const token = await AsyncStorage.getItem('token');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      expect(token).toBeNull();
      expect(refreshToken).toBeNull();
      
      // Verify mobile-specific behaviors
      expect(mockHapticFeedback.impactAsync).toHaveBeenCalled();
      expect(mockToastService.show).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth');
    });
  });

  describe('Mobile Network Connectivity', () => {
    it('should handle network connectivity issues', async () => {
      // Simulate no network connection
      mockApiHandler.setNetworkInfo({
        isConnected: false,
        type: 'none',
        isWifiEnabled: false,
      });

      await expect(
        mockApiHandler.handleRequest('GET', '/api/test')
      ).rejects.toThrow('Network request failed - No internet connection');
    });

    it('should handle cellular vs wifi network changes', async () => {
      // Test cellular network
      mockApiHandler.setNetworkInfo({
        isConnected: true,
        type: 'cellular',
        isWifiEnabled: false,
      });

      const cellularResponse = await mockApiHandler.handleRequest('GET', '/api/test');
      expect(cellularResponse.ok).toBe(true);

      // Test wifi network
      mockApiHandler.setNetworkInfo({
        isConnected: true,
        type: 'wifi',
        isWifiEnabled: true,
      });

      const wifiResponse = await mockApiHandler.handleRequest('GET', '/api/test');
      expect(wifiResponse.ok).toBe(true);
    });
  });

  describe('Mobile Device Token Management', () => {
    it('should handle device token registration and revocation', async () => {
      const deviceToken = 'expo_push_token_123';
      
      // Register device token
      const authResponse = await authService.authenticateUser(
        'test@example.com',
        'correct_password',
        deviceToken
      );
      
      expect(authResponse.user.deviceTokens).toContain(deviceToken);
      
      // Verify device token was stored
      const storedTokens = authService.getDeviceTokens(authResponse.user.id);
      expect(storedTokens).toContain(deviceToken);
      
      // Revoke device token
      await authService.revokeDeviceToken(authResponse.user.id, deviceToken);
      
      const tokensAfterRevoke = authService.getDeviceTokens(authResponse.user.id);
      expect(tokensAfterRevoke).not.toContain(deviceToken);
    });

    it('should handle multiple device tokens for same user', async () => {
      const deviceToken1 = 'expo_push_token_123';
      const deviceToken2 = 'expo_push_token_456';
      
      // Register first device
      await authService.authenticateUser(
        'test@example.com',
        'correct_password',
        deviceToken1
      );
      
      // Register second device
      await authService.authenticateUser(
        'test@example.com',
        'correct_password',
        deviceToken2
      );
      
      const tokens = authService.getDeviceTokens(1);
      expect(tokens).toContain(deviceToken1);
      expect(tokens).toContain(deviceToken2);
      expect(tokens).toHaveLength(2);
    });
  });

  describe('Mobile Performance Optimization', () => {
    it('should handle authentication failures efficiently on mobile', async () => {
      const startTime = performance.now();
      
      // Simulate 100 concurrent authentication failures
      const failures = Array(100).fill(null).map(() => 
        mockAuthFailureHandler.handleAuthFailure(new Error('Test error'))
      );
      
      await Promise.all(failures);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time for mobile
      expect(duration).toBeLessThan(1000); // Less than 1 second
      
      // Verify all calls were made
      expect(mockHapticFeedback.impactAsync).toHaveBeenCalledTimes(100);
      expect(mockToastService.show).toHaveBeenCalledTimes(100);
      expect(mockRouter.replace).toHaveBeenCalledTimes(100);
    });

    it('should optimize AsyncStorage operations for mobile', async () => {
      // Test batch operations
      const batchData = {
        token: 'test_token',
        refreshToken: 'test_refresh_token',
        user: JSON.stringify({ id: 1, email: 'test@example.com' }),
      };
      
      const startTime = performance.now();
      
      // Use multiSet for better performance
      await AsyncStorage.multiSet(Object.entries(batchData));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be faster than individual setItem calls
      expect(duration).toBeLessThan(50); // Less than 50ms
      
      // Verify data was stored correctly
      const storedToken = await AsyncStorage.getItem('token');
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      expect(storedToken).toBe('test_token');
      expect(storedRefreshToken).toBe('test_refresh_token');
      expect(JSON.parse(storedUser!)).toEqual({ id: 1, email: 'test@example.com' });
    });
  });
});