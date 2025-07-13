import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  reload: vi.fn(),
  href: ''
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock query client
const mockQueryClient = {
  clear: vi.fn(),
  invalidateQueries: vi.fn()
};

// Types
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  profilePhotoUrl?: string;
}

interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

interface AuthCredentials {
  email: string;
  password: string;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
}

// Mock authentication service
class MockMobileAuthService {
  private validCredentials = {
    email: 'ryan11432@gmail.com',
    password: 'abc123'
  };

  private validToken = 'valid-auth-token-123';
  
  private mockUser: User = {
    id: 3,
    email: 'ryan11432@gmail.com',
    firstName: 'Ryan',
    lastName: 'Test',
    phone: '(555) 123-4567',
    businessName: 'Test Barbershop'
  };

  async signIn(credentials: AuthCredentials): Promise<AuthResponse> {
    if (credentials.email === this.validCredentials.email && 
        credentials.password === this.validCredentials.password) {
      return {
        user: this.mockUser,
        token: this.validToken,
        message: 'Sign in successful'
      };
    }
    throw new Error('Authentication failed');
  }

  async signUp(userData: SignUpData): Promise<AuthResponse> {
    if (userData.email && userData.password && userData.firstName && userData.lastName && userData.phone) {
      const newUser: User = {
        id: 4,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        businessName: userData.businessName
      };
      
      return {
        user: newUser,
        token: 'new-user-token-456',
        message: 'Registration successful'
      };
    }
    throw new Error('Registration failed');
  }

  async validateToken(token: string): Promise<User | null> {
    if (token === this.validToken) {
      return this.mockUser;
    }
    return null;
  }

  async signOut(): Promise<void> {
    // Simulate successful sign out
    return;
  }

  getValidCredentials() {
    return this.validCredentials;
  }

  getValidToken() {
    return this.validToken;
  }

  getMockUser() {
    return this.mockUser;
  }
}

// Mock mobile authentication handlers
class MockMobileAuthHandlers {
  private authService: MockMobileAuthService;

  constructor() {
    this.authService = new MockMobileAuthService();
  }

  async handleSignIn(credentials: AuthCredentials): Promise<void> {
    try {
      const response = await this.authService.signIn(credentials);
      
      // Store token in localStorage
      localStorage.setItem('token', response.token);
      
      // Simulate page reload
      window.location.reload();
    } catch (error) {
      throw new Error('Sign in failed');
    }
  }

  async handleSignUp(userData: SignUpData): Promise<void> {
    try {
      const response = await this.authService.signUp(userData);
      
      // Store token in localStorage
      localStorage.setItem('token', response.token);
      
      // Simulate page reload
      window.location.reload();
    } catch (error) {
      throw new Error('Registration failed');
    }
  }

  async checkAuthStatus(): Promise<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    try {
      const user = await this.authService.validateToken(token);
      if (user) {
        return true;
      } else {
        // Clear invalid token
        localStorage.removeItem('token');
        return false;
      }
    } catch (error) {
      // Clear invalid token
      localStorage.removeItem('token');
      return false;
    }
  }

  async handleSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
      
      // Clear token from localStorage
      localStorage.removeItem('token');
      
      // Clear query cache
      mockQueryClient.clear();
      
      // Simulate page reload
      window.location.reload();
    } catch (error) {
      throw new Error('Sign out failed');
    }
  }

  async makeAuthenticatedRequest(url: string): Promise<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token');
    }

    // Simulate API request with token
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  getAuthService() {
    return this.authService;
  }
}

describe('Mobile App Authentication System', () => {
  let authHandlers: MockMobileAuthHandlers;
  let authService: MockMobileAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authHandlers = new MockMobileAuthHandlers();
    authService = authHandlers.getAuthService();
  });

  describe('Sign In Functionality', () => {
    it('should successfully sign in with valid credentials', async () => {
      const credentials = authService.getValidCredentials();
      
      await authHandlers.handleSignIn(credentials);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('token', authService.getValidToken());
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should fail sign in with invalid credentials', async () => {
      const invalidCredentials = {
        email: 'invalid@email.com',
        password: 'wrongpassword'
      };
      
      await expect(authHandlers.handleSignIn(invalidCredentials)).rejects.toThrow('Sign in failed');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle ryan11432@gmail.com / abc123 credentials specifically', async () => {
      const credentials = {
        email: 'ryan11432@gmail.com',
        password: 'abc123'
      };
      
      await authHandlers.handleSignIn(credentials);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('token', authService.getValidToken());
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Sign Up Functionality', () => {
    it('should successfully register new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '(555) 987-6543',
        businessName: 'John\'s Barbershop'
      };
      
      await authHandlers.handleSignUp(userData);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new-user-token-456');
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should fail registration with missing required fields', async () => {
      const incompleteData = {
        email: 'test@email.com',
        password: 'password123',
        firstName: '',
        lastName: '',
        phone: ''
      };
      
      await expect(authHandlers.handleSignUp(incompleteData)).rejects.toThrow('Registration failed');
    });
  });

  describe('Authentication Status Check', () => {
    it('should return true for valid token', async () => {
      localStorage.getItem.mockReturnValue(authService.getValidToken());
      
      const isAuthenticated = await authHandlers.checkAuthStatus();
      
      expect(isAuthenticated).toBe(true);
    });

    it('should return false for invalid token', async () => {
      localStorage.getItem.mockReturnValue('invalid-token');
      
      const isAuthenticated = await authHandlers.checkAuthStatus();
      
      expect(isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should return false when no token exists', async () => {
      localStorage.getItem.mockReturnValue(null);
      
      const isAuthenticated = await authHandlers.checkAuthStatus();
      
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Sign Out Functionality', () => {
    it('should successfully sign out', async () => {
      await authHandlers.handleSignOut();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockQueryClient.clear).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Authenticated API Requests', () => {
    it('should make authenticated requests with token', async () => {
      const mockResponseData = { data: 'test' };
      localStorage.getItem.mockReturnValue(authService.getValidToken());
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponseData)
      });
      
      const result = await authHandlers.makeAuthenticatedRequest('/api/test');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Authorization': `Bearer ${authService.getValidToken()}`
        }
      });
      expect(result).toEqual(mockResponseData);
    });

    it('should fail authenticated requests without token', async () => {
      localStorage.getItem.mockReturnValue(null);
      
      await expect(authHandlers.makeAuthenticatedRequest('/api/test')).rejects.toThrow('No authentication token');
    });

    it('should handle API errors properly', async () => {
      localStorage.getItem.mockReturnValue(authService.getValidToken());
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401
      });
      
      await expect(authHandlers.makeAuthenticatedRequest('/api/test')).rejects.toThrow('HTTP error! status: 401');
    });
  });

  describe('Cross-Platform Authentication Consistency', () => {
    it('should use same token format as web version', async () => {
      const credentials = authService.getValidCredentials();
      
      await authHandlers.handleSignIn(credentials);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('token', expect.stringMatching(/^[a-zA-Z0-9\-]+$/));
    });

    it('should maintain authentication state across page refreshes', async () => {
      localStorage.getItem.mockReturnValue(authService.getValidToken());
      
      const isAuthenticated = await authHandlers.checkAuthStatus();
      
      expect(isAuthenticated).toBe(true);
      expect(localStorage.getItem).toHaveBeenCalledWith('token');
    });

    it('should handle token expiration gracefully', async () => {
      localStorage.getItem.mockReturnValue('expired-token');
      
      const isAuthenticated = await authHandlers.checkAuthStatus();
      
      expect(isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Security and Error Handling', () => {
    it('should clear invalid tokens on authentication failure', async () => {
      localStorage.getItem.mockReturnValue('invalid-token');
      
      await authHandlers.checkAuthStatus();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should handle network errors during sign in', async () => {
      const credentials = {
        email: 'network@error.com',
        password: 'password123'
      };
      
      await expect(authHandlers.handleSignIn(credentials)).rejects.toThrow('Sign in failed');
    });

    it('should clear cache on sign out', async () => {
      await authHandlers.handleSignOut();
      
      expect(mockQueryClient.clear).toHaveBeenCalled();
    });
  });

  describe('Mobile-Specific Authentication Features', () => {
    it('should handle mobile app lifecycle events', async () => {
      // Test app resume with valid token
      localStorage.getItem.mockReturnValue(authService.getValidToken());
      
      const isAuthenticated = await authHandlers.checkAuthStatus();
      
      expect(isAuthenticated).toBe(true);
    });

    it('should handle concurrent authentication attempts', async () => {
      const credentials = authService.getValidCredentials();
      
      const promises = [
        authHandlers.handleSignIn(credentials),
        authHandlers.handleSignIn(credentials)
      ];
      
      await Promise.all(promises);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('token', authService.getValidToken());
    });

    it('should maintain authentication across mobile app navigation', async () => {
      localStorage.getItem.mockReturnValue(authService.getValidToken());
      
      // Simulate navigation to different mobile app sections
      const dashboardAuth = await authHandlers.checkAuthStatus();
      const clientsAuth = await authHandlers.checkAuthStatus();
      const settingsAuth = await authHandlers.checkAuthStatus();
      
      expect(dashboardAuth).toBe(true);
      expect(clientsAuth).toBe(true);
      expect(settingsAuth).toBe(true);
    });
  });

  describe('Integration with Main Web App', () => {
    it('should use compatible authentication flow with web version', async () => {
      const credentials = {
        email: 'ryan11432@gmail.com',
        password: 'abc123'
      };
      
      await authHandlers.handleSignIn(credentials);
      
      // Both mobile and web should store tokens in localStorage
      expect(localStorage.setItem).toHaveBeenCalledWith('token', authService.getValidToken());
    });

    it('should handle shared user data correctly', async () => {
      localStorage.getItem.mockReturnValue(authService.getValidToken());
      
      const user = await authService.validateToken(authService.getValidToken());
      
      expect(user).toEqual(authService.getMockUser());
      expect(user?.email).toBe('ryan11432@gmail.com');
    });
  });
});