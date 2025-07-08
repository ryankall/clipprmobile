import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
};

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
  reload: vi.fn(),
};

// Mock setTimeout
const mockSetTimeout = vi.fn();

// Mock query client
const mockQueryClient = {
  clear: vi.fn(),
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
};

// Mock fetch
const mockFetch = vi.fn();

// Authentication failure scenarios
interface AuthFailureScenario {
  name: string;
  responseStatus: number;
  responseBody: string;
  expectedError: string;
  shouldRedirect: boolean;
  shouldClearToken: boolean;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

// Mock authentication service
class MockAuthService {
  private users: User[] = [];
  private validTokens: Set<string> = new Set();
  
  constructor() {
    this.setupMockUsers();
  }

  private setupMockUsers(): void {
    this.users = [
      {
        id: 1,
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '5551234567',
      },
      {
        id: 2,
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '5559876543',
      },
    ];
  }

  async authenticateUser(email: string, password: string): Promise<AuthResponse> {
    const user = this.users.find(u => u.email === email);
    
    if (!user || password !== 'validpassword') {
      throw new Error('Invalid credentials');
    }

    const token = `mock_token_${user.id}_${Date.now()}`;
    this.validTokens.add(token);
    
    return {
      user,
      token,
      message: 'Authentication successful',
    };
  }

  async validateToken(token: string): Promise<User | null> {
    if (!this.validTokens.has(token)) {
      return null;
    }

    const userId = parseInt(token.split('_')[2]);
    return this.users.find(u => u.id === userId) || null;
  }

  invalidateToken(token: string): void {
    this.validTokens.delete(token);
  }

  // Simulate expired token
  expireToken(token: string): void {
    this.validTokens.delete(token);
  }
}

// Mock API request handler
class MockApiHandler {
  private authService: MockAuthService;
  
  constructor() {
    this.authService = new MockAuthService();
  }

  async handleRequest(method: string, url: string, options: any = {}): Promise<Response> {
    const token = options.headers?.Authorization?.replace('Bearer ', '');
    
    // Simulate authentication endpoints
    if (url === '/api/auth/me') {
      if (!token) {
        return new Response(JSON.stringify({ message: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const user = await this.authService.validateToken(token);
      if (!user) {
        return new Response(JSON.stringify({ message: 'Invalid or expired token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Simulate protected endpoints
    if (url.startsWith('/api/') && url !== '/api/auth/signin') {
      if (!token) {
        return new Response(JSON.stringify({ message: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const user = await this.authService.validateToken(token);
      if (!user) {
        return new Response(JSON.stringify({ message: 'Authentication expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getAuthService(): MockAuthService {
    return this.authService;
  }
}

// Authentication failure handler
class AuthFailureHandler {
  private localStorage: typeof mockLocalStorage;
  private queryClient: typeof mockQueryClient;
  private location: typeof mockLocation;
  
  constructor(
    localStorage: typeof mockLocalStorage,
    queryClient: typeof mockQueryClient,
    location: typeof mockLocation
  ) {
    this.localStorage = localStorage;
    this.queryClient = queryClient;
    this.location = location;
  }

  handleAuthFailure(error: any): void {
    const isAuthError = error?.message?.includes('401') || 
                       error?.message?.includes('Authentication') ||
                       error?.message?.includes('expired');

    if (isAuthError) {
      // Clear stored authentication data
      this.localStorage.removeItem('token');
      this.queryClient.clear();
      
      // Only redirect if not already on login page
      const isOnLoginPage = this.location.href === '/' || this.location.href === '/auth';
      if (!isOnLoginPage) {
        // Redirect to login page
        setTimeout(() => {
          this.location.href = '/';
        }, 1000);
      }
    }
  }

  async makeAuthenticatedRequest(url: string, options: any = {}): Promise<any> {
    const token = this.localStorage.getItem('token');
    
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    const response = await mockFetch(url, options);
    
    if (response.status === 401) {
      this.handleAuthFailure(new Error('Authentication expired'));
      throw new Error('Authentication expired. Please sign in again.');
    }

    return response.json();
  }
}

describe('Authentication Failure Handling System', () => {
  let mockApiHandler: MockApiHandler;
  let authFailureHandler: AuthFailureHandler;
  let authService: MockAuthService;

  beforeEach(() => {
    // Reset mocks
    mockLocalStorage.store = {};
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.clear.mockClear();
    
    mockLocation.href = '';
    mockLocation.assign.mockClear();
    mockLocation.reload.mockClear();
    
    mockQueryClient.clear.mockClear();
    mockQueryClient.invalidateQueries.mockClear();
    mockQueryClient.setQueryData.mockClear();
    mockQueryClient.getQueryData.mockClear();
    
    mockFetch.mockClear();
    mockSetTimeout.mockClear();

    // Setup services
    mockApiHandler = new MockApiHandler();
    authService = mockApiHandler.getAuthService();
    authFailureHandler = new AuthFailureHandler(mockLocalStorage, mockQueryClient, mockLocation);

    // Mock fetch to use our API handler
    mockFetch.mockImplementation(async (url: string, options: any = {}) => {
      return await mockApiHandler.handleRequest('GET', url, options);
    });

    // Mock setTimeout
    vi.stubGlobal('setTimeout', mockSetTimeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Failure Detection', () => {
    it('should detect 401 status code as authentication failure', async () => {
      // Setup: No token in localStorage
      mockLocalStorage.store = {};

      try {
        await authFailureHandler.makeAuthenticatedRequest('/api/auth/me');
      } catch (error) {
        expect(error.message).toBe('Authentication expired. Please sign in again.');
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should detect expired token as authentication failure', async () => {
      // Setup: Invalid token in localStorage
      mockLocalStorage.store = { token: 'expired_token_123' };

      try {
        await authFailureHandler.makeAuthenticatedRequest('/api/auth/me');
      } catch (error) {
        expect(error.message).toBe('Authentication expired. Please sign in again.');
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
    });

    it('should detect authentication required message', () => {
      const error = new Error('Authentication required');
      
      authFailureHandler.handleAuthFailure(error);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should detect various authentication error messages', () => {
      const errorMessages = [
        'Authentication expired',
        'Invalid or expired token',
        '401: Unauthorized',
        'Authentication required',
      ];

      errorMessages.forEach(message => {
        const error = new Error(message);
        authFailureHandler.handleAuthFailure(error);
        
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
        expect(mockQueryClient.clear).toHaveBeenCalled();
      });
    });
  });

  describe('Token Cleanup and Redirect', () => {
    it('should clear localStorage token on authentication failure', () => {
      mockLocalStorage.store = { token: 'valid_token_123' };
      
      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorage.store.token).toBeUndefined();
    });

    it('should clear query client cache on authentication failure', () => {
      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      expect(mockQueryClient.clear).toHaveBeenCalled();
    });

    it('should redirect to login page after authentication failure', () => {
      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      
      // Execute the timeout callback
      const timeoutCallback = mockSetTimeout.mock.calls[0][0];
      timeoutCallback();
      
      expect(mockLocation.href).toBe('/');
    });

    it('should handle authentication failure with proper delay', () => {
      const error = new Error('401: Unauthorized');
      authFailureHandler.handleAuthFailure(error);

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Protected Route Handling', () => {
    it('should handle authentication failure on protected routes', async () => {
      // Setup: No token
      mockLocalStorage.store = {};

      try {
        await authFailureHandler.makeAuthenticatedRequest('/api/appointments');
      } catch (error) {
        expect(error.message).toBe('Authentication expired. Please sign in again.');
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
    });

    it('should handle authentication failure on user profile endpoint', async () => {
      mockLocalStorage.store = { token: 'invalid_token' };

      try {
        await authFailureHandler.makeAuthenticatedRequest('/api/auth/me');
      } catch (error) {
        expect(error.message).toBe('Authentication expired. Please sign in again.');
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should handle authentication failure on client endpoints', async () => {
      mockLocalStorage.store = { token: 'expired_token' };

      try {
        await authFailureHandler.makeAuthenticatedRequest('/api/clients');
      } catch (error) {
        expect(error.message).toBe('Authentication expired. Please sign in again.');
      }

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Multiple Authentication Failures', () => {
    it('should handle multiple consecutive authentication failures', () => {
      mockLocalStorage.store = { token: 'some_token' };

      // First failure
      const error1 = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error1);

      // Second failure
      const error2 = new Error('401: Unauthorized');
      authFailureHandler.handleAuthFailure(error2);

      // Should handle both failures
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(2);
      expect(mockQueryClient.clear).toHaveBeenCalledTimes(2);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication failure with concurrent requests', async () => {
      mockLocalStorage.store = { token: 'expired_token' };

      const requests = [
        authFailureHandler.makeAuthenticatedRequest('/api/auth/me'),
        authFailureHandler.makeAuthenticatedRequest('/api/appointments'),
        authFailureHandler.makeAuthenticatedRequest('/api/clients'),
      ];

      // All requests should fail with authentication error
      await Promise.allSettled(requests);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null or undefined errors gracefully', () => {
      authFailureHandler.handleAuthFailure(null);
      authFailureHandler.handleAuthFailure(undefined);

      // Should not trigger authentication failure handling
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(mockQueryClient.clear).not.toHaveBeenCalled();
    });

    it('should handle non-authentication errors without redirecting', () => {
      const nonAuthError = new Error('Network error');
      authFailureHandler.handleAuthFailure(nonAuthError);

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(mockQueryClient.clear).not.toHaveBeenCalled();
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should handle errors without message property', () => {
      const errorWithoutMessage = { status: 401 };
      authFailureHandler.handleAuthFailure(errorWithoutMessage);

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(mockQueryClient.clear).not.toHaveBeenCalled();
    });

    it('should handle empty token in localStorage', () => {
      mockLocalStorage.store = { token: '' };

      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
    });
  });

  describe('Integration with React Query', () => {
    it('should properly clear React Query cache on authentication failure', () => {
      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      expect(mockQueryClient.clear).toHaveBeenCalled();
    });

    it('should handle authentication failure during query execution', async () => {
      mockLocalStorage.store = { token: 'invalid_token' };

      try {
        await authFailureHandler.makeAuthenticatedRequest('/api/auth/me');
      } catch (error) {
        expect(error.message).toBe('Authentication expired. Please sign in again.');
      }

      expect(mockQueryClient.clear).toHaveBeenCalled();
    });
  });

  describe('Redirect Loop Prevention', () => {
    it('should not redirect when already on login page', () => {
      // Mock being on login page
      mockLocation.href = '/';

      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      // Should clear token and cache but not redirect
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should not redirect when on auth page', () => {
      // Mock being on auth page
      mockLocation.href = '/auth';

      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      // Should clear token and cache but not redirect
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should redirect when on protected page', () => {
      // Mock being on protected page
      mockLocation.href = '/dashboard';

      const error = new Error('Authentication expired');
      authFailureHandler.handleAuthFailure(error);

      // Should clear token, cache, and redirect
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should prevent authentication query when no token exists', () => {
      // Mock no token in localStorage
      mockLocalStorage.store = {};

      // This simulates the query being disabled when no token exists
      const shouldRunQuery = !!mockLocalStorage.getItem('token');
      
      expect(shouldRunQuery).toBe(false);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
    });
  });
});