import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock interfaces for OAuth sign-in testing
interface User {
  id: number;
  email: string;
  password?: string;
  phone: string;
  businessName?: string;
  firstName?: string;
  lastName?: string;
  googleId?: string;
  appleId?: string;
  photoUrl?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
}

interface GoogleProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
  photos: Array<{
    value: string;
  }>;
  provider: 'google';
}

interface AppleProfile {
  id: string;
  displayName?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
  emailVerified?: boolean;
  provider: 'apple';
}

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  requiresPhoneVerification?: boolean;
}

// Mock storage service for OAuth operations
class MockOAuthStorage {
  private users: Map<number, User> = new Map();
  private emailIndex: Map<string, number> = new Map();
  private phoneIndex: Map<string, number> = new Map();
  private googleIdIndex: Map<string, number> = new Map();
  private appleIdIndex: Map<string, number> = new Map();
  private nextUserId = 1;

  constructor() {
    this.setupTestData();
  }

  private setupTestData(): void {
    // Existing user with email only (no OAuth linked)
    const existingUser: User = {
      id: 1,
      email: 'john@example.com',
      password: 'hashedPassword123',
      phone: '+1234567890',
      businessName: 'John\'s Barber Shop',
      firstName: 'John',
      lastName: 'Doe',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date('2024-01-01'),
    };

    // User with Google account already linked
    const googleUser: User = {
      id: 2,
      email: 'googleuser@gmail.com',
      phone: '+1987654321',
      businessName: 'Google Barber',
      firstName: 'Google',
      lastName: 'User',
      googleId: 'google123456',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date('2024-01-02'),
    };

    // User with Apple account already linked
    const appleUser: User = {
      id: 3,
      email: 'appleuser@icloud.com',
      phone: '+1555666777',
      businessName: 'Apple Cuts',
      firstName: 'Apple',
      lastName: 'User',
      appleId: 'apple789012',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date('2024-01-03'),
    };

    // User with both Google and Apple linked
    const dualUser: User = {
      id: 4,
      email: 'dual@example.com',
      phone: '+1444555666',
      businessName: 'Dual Auth Barber',
      firstName: 'Dual',
      lastName: 'Auth',
      googleId: 'google999888',
      appleId: 'apple333444',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date('2024-01-04'),
    };

    this.addUser(existingUser);
    this.addUser(googleUser);
    this.addUser(appleUser);
    this.addUser(dualUser);
  }

  private addUser(user: User): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);
    this.phoneIndex.set(user.phone, user.id);
    if (user.googleId) {
      this.googleIdIndex.set(user.googleId, user.id);
    }
    if (user.appleId) {
      this.appleIdIndex.set(user.appleId, user.id);
    }
    if (user.id >= this.nextUserId) {
      this.nextUserId = user.id + 1;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const userId = this.emailIndex.get(email);
    return userId ? this.users.get(userId) : undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const userId = this.googleIdIndex.get(googleId);
    return userId ? this.users.get(userId) : undefined;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const userId = this.appleIdIndex.get(appleId);
    return userId ? this.users.get(userId) : undefined;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);

    // Update indexes if necessary
    if (updates.googleId && updates.googleId !== user.googleId) {
      if (user.googleId) {
        this.googleIdIndex.delete(user.googleId);
      }
      this.googleIdIndex.set(updates.googleId, id);
    }

    if (updates.appleId && updates.appleId !== user.appleId) {
      if (user.appleId) {
        this.appleIdIndex.delete(user.appleId);
      }
      this.appleIdIndex.set(updates.appleId, id);
    }

    return updatedUser;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: this.nextUserId++,
      createdAt: new Date(),
    };

    this.addUser(user);
    return user;
  }

  getUser(id: number): User | undefined {
    return this.users.get(id);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

// Mock OAuth service for handling Google and Apple sign-in
class MockOAuthService {
  private storage: MockOAuthStorage;
  private jwtSecret = 'test-jwt-secret';

  constructor() {
    this.storage = new MockOAuthStorage();
  }

  generateToken(userId: number): string {
    // Simple token generation for testing
    return `jwt_token_${userId}_${Date.now()}`;
  }

  async handleGoogleSignIn(profile: GoogleProfile, tokens: OAuthTokens): Promise<AuthResult> {
    try {
      // Check if user exists with Google ID
      let user = await this.storage.getUserByGoogleId(profile.id);
      
      if (!user && profile.emails?.[0]?.value) {
        // Check if user exists with email
        user = await this.storage.getUserByEmail(profile.emails[0].value);
        if (user) {
          // Link Google account to existing user
          user = await this.storage.updateUser(user.id, { googleId: profile.id });
        }
      }

      if (!user) {
        // For testing, we'll simulate that phone number is required
        // In real implementation, this would redirect to phone verification
        return {
          success: false,
          error: 'Phone number required for signup',
          requiresPhoneVerification: true,
        };
      }

      const token = this.generateToken(user.id);
      
      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth sign-in failed',
      };
    }
  }

  async handleAppleSignIn(profile: AppleProfile, tokens: OAuthTokens): Promise<AuthResult> {
    try {
      // Check if user exists with Apple ID
      let user = await this.storage.getUserByAppleId(profile.id);
      
      if (!user && profile.email) {
        // Check if user exists with email
        user = await this.storage.getUserByEmail(profile.email);
        if (user) {
          // Link Apple account to existing user
          user = await this.storage.updateUser(user.id, { appleId: profile.id });
        }
      }

      if (!user) {
        // For testing, we'll simulate that phone number is required
        // In real implementation, this would redirect to phone verification
        return {
          success: false,
          error: 'Phone number required for signup',
          requiresPhoneVerification: true,
        };
      }

      const token = this.generateToken(user.id);
      
      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth sign-in failed',
      };
    }
  }

  async linkGoogleAccount(userId: number, googleId: string): Promise<AuthResult> {
    try {
      // Check if Google ID is already linked to another user
      const existingUser = await this.storage.getUserByGoogleId(googleId);
      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: 'Google account is already linked to another user',
        };
      }

      const user = await this.storage.updateUser(userId, { googleId });
      const token = this.generateToken(user.id);

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link Google account',
      };
    }
  }

  async linkAppleAccount(userId: number, appleId: string): Promise<AuthResult> {
    try {
      // Check if Apple ID is already linked to another user
      const existingUser = await this.storage.getUserByAppleId(appleId);
      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: 'Apple account is already linked to another user',
        };
      }

      const user = await this.storage.updateUser(userId, { appleId });
      const token = this.generateToken(user.id);

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link Apple account',
      };
    }
  }

  async unlinkGoogleAccount(userId: number): Promise<AuthResult> {
    try {
      const user = await this.storage.updateUser(userId, { googleId: undefined });
      const token = this.generateToken(user.id);

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlink Google account',
      };
    }
  }

  async unlinkAppleAccount(userId: number): Promise<AuthResult> {
    try {
      const user = await this.storage.updateUser(userId, { appleId: undefined });
      const token = this.generateToken(user.id);

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlink Apple account',
      };
    }
  }

  getStorage(): MockOAuthStorage {
    return this.storage;
  }
}

describe('OAuth Sign-In System Tests', () => {
  let oauthService: MockOAuthService;
  let storage: MockOAuthStorage;

  beforeEach(() => {
    oauthService = new MockOAuthService();
    storage = oauthService.getStorage();
  });

  describe('Google OAuth Sign-In', () => {
    it('should sign in existing user with Google account', async () => {
      const googleProfile: GoogleProfile = {
        id: 'google123456',
        displayName: 'Google User',
        name: {
          familyName: 'User',
          givenName: 'Google',
        },
        emails: [
          {
            value: 'googleuser@gmail.com',
            verified: true,
          },
        ],
        photos: [
          {
            value: 'https://example.com/photo.jpg',
          },
        ],
        provider: 'google',
      };

      const tokens: OAuthTokens = {
        accessToken: 'google_access_token',
        refreshToken: 'google_refresh_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleGoogleSignIn(googleProfile, tokens);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.googleId).toBe('google123456');
      expect(result.user?.email).toBe('googleuser@gmail.com');
      expect(result.token).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should link Google account to existing user with matching email', async () => {
      const googleProfile: GoogleProfile = {
        id: 'new_google_id',
        displayName: 'John Doe',
        name: {
          familyName: 'Doe',
          givenName: 'John',
        },
        emails: [
          {
            value: 'john@example.com', // Matches existing user
            verified: true,
          },
        ],
        photos: [],
        provider: 'google',
      };

      const tokens: OAuthTokens = {
        accessToken: 'google_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleGoogleSignIn(googleProfile, tokens);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.googleId).toBe('new_google_id');
      expect(result.user?.email).toBe('john@example.com');
      expect(result.user?.id).toBe(1); // Existing user ID
      expect(result.token).toBeDefined();
    });

    it('should fail when Google user has no phone number for new signup', async () => {
      const googleProfile: GoogleProfile = {
        id: 'new_google_user',
        displayName: 'New User',
        name: {
          familyName: 'User',
          givenName: 'New',
        },
        emails: [
          {
            value: 'newuser@gmail.com', // No existing user
            verified: true,
          },
        ],
        photos: [],
        provider: 'google',
      };

      const tokens: OAuthTokens = {
        accessToken: 'google_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleGoogleSignIn(googleProfile, tokens);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number required for signup');
      expect(result.requiresPhoneVerification).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should handle Google profile without email', async () => {
      const googleProfile: GoogleProfile = {
        id: 'google_no_email',
        displayName: 'No Email User',
        name: {
          familyName: 'User',
          givenName: 'No Email',
        },
        emails: [], // No email provided
        photos: [],
        provider: 'google',
      };

      const tokens: OAuthTokens = {
        accessToken: 'google_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleGoogleSignIn(googleProfile, tokens);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number required for signup');
      expect(result.requiresPhoneVerification).toBe(true);
    });
  });

  describe('Apple OAuth Sign-In', () => {
    it('should sign in existing user with Apple account', async () => {
      const appleProfile: AppleProfile = {
        id: 'apple789012',
        displayName: 'Apple User',
        name: {
          firstName: 'Apple',
          lastName: 'User',
        },
        email: 'appleuser@icloud.com',
        emailVerified: true,
        provider: 'apple',
      };

      const tokens: OAuthTokens = {
        accessToken: 'apple_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleAppleSignIn(appleProfile, tokens);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.appleId).toBe('apple789012');
      expect(result.user?.email).toBe('appleuser@icloud.com');
      expect(result.token).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should link Apple account to existing user with matching email', async () => {
      const appleProfile: AppleProfile = {
        id: 'new_apple_id',
        displayName: 'John Doe',
        name: {
          firstName: 'John',
          lastName: 'Doe',
        },
        email: 'john@example.com', // Matches existing user
        emailVerified: true,
        provider: 'apple',
      };

      const tokens: OAuthTokens = {
        accessToken: 'apple_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleAppleSignIn(appleProfile, tokens);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.appleId).toBe('new_apple_id');
      expect(result.user?.email).toBe('john@example.com');
      expect(result.user?.id).toBe(1); // Existing user ID
      expect(result.token).toBeDefined();
    });

    it('should fail when Apple user has no phone number for new signup', async () => {
      const appleProfile: AppleProfile = {
        id: 'new_apple_user',
        displayName: 'New Apple User',
        name: {
          firstName: 'New',
          lastName: 'User',
        },
        email: 'newappleuser@icloud.com', // No existing user
        emailVerified: true,
        provider: 'apple',
      };

      const tokens: OAuthTokens = {
        accessToken: 'apple_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleAppleSignIn(appleProfile, tokens);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number required for signup');
      expect(result.requiresPhoneVerification).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should handle Apple profile without email', async () => {
      const appleProfile: AppleProfile = {
        id: 'apple_no_email',
        displayName: 'No Email Apple User',
        name: {
          firstName: 'No Email',
          lastName: 'User',
        },
        // No email provided
        provider: 'apple',
      };

      const tokens: OAuthTokens = {
        accessToken: 'apple_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleAppleSignIn(appleProfile, tokens);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number required for signup');
      expect(result.requiresPhoneVerification).toBe(true);
    });
  });

  describe('OAuth Account Linking', () => {
    it('should link Google account to existing user', async () => {
      const userId = 1; // Existing user without Google ID
      const googleId = 'new_google_link';

      const result = await oauthService.linkGoogleAccount(userId, googleId);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.googleId).toBe(googleId);
      expect(result.user?.id).toBe(userId);
      expect(result.token).toBeDefined();
    });

    it('should link Apple account to existing user', async () => {
      const userId = 1; // Existing user without Apple ID
      const appleId = 'new_apple_link';

      const result = await oauthService.linkAppleAccount(userId, appleId);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.appleId).toBe(appleId);
      expect(result.user?.id).toBe(userId);
      expect(result.token).toBeDefined();
    });

    it('should fail to link Google account already linked to another user', async () => {
      const userId = 1;
      const googleId = 'google123456'; // Already linked to user ID 2

      const result = await oauthService.linkGoogleAccount(userId, googleId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Google account is already linked to another user');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should fail to link Apple account already linked to another user', async () => {
      const userId = 1;
      const appleId = 'apple789012'; // Already linked to user ID 3

      const result = await oauthService.linkAppleAccount(userId, appleId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Apple account is already linked to another user');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
  });

  describe('OAuth Account Unlinking', () => {
    it('should unlink Google account from user', async () => {
      const userId = 2; // User with Google account linked

      const result = await oauthService.unlinkGoogleAccount(userId);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.googleId).toBeUndefined();
      expect(result.user?.id).toBe(userId);
      expect(result.token).toBeDefined();
    });

    it('should unlink Apple account from user', async () => {
      const userId = 3; // User with Apple account linked

      const result = await oauthService.unlinkAppleAccount(userId);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.appleId).toBeUndefined();
      expect(result.user?.id).toBe(userId);
      expect(result.token).toBeDefined();
    });
  });

  describe('Multi-Provider OAuth', () => {
    it('should handle user with both Google and Apple accounts', async () => {
      const user = storage.getUser(4); // User with both accounts
      
      expect(user).toBeDefined();
      expect(user?.googleId).toBe('google999888');
      expect(user?.appleId).toBe('apple333444');
      expect(user?.email).toBe('dual@example.com');
    });

    it('should sign in with Google when user has both providers', async () => {
      const googleProfile: GoogleProfile = {
        id: 'google999888',
        displayName: 'Dual Auth',
        name: {
          familyName: 'Auth',
          givenName: 'Dual',
        },
        emails: [
          {
            value: 'dual@example.com',
            verified: true,
          },
        ],
        photos: [],
        provider: 'google',
      };

      const tokens: OAuthTokens = {
        accessToken: 'google_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleGoogleSignIn(googleProfile, tokens);
      
      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(4);
      expect(result.user?.googleId).toBe('google999888');
      expect(result.user?.appleId).toBe('apple333444');
    });

    it('should sign in with Apple when user has both providers', async () => {
      const appleProfile: AppleProfile = {
        id: 'apple333444',
        displayName: 'Dual Auth',
        name: {
          firstName: 'Dual',
          lastName: 'Auth',
        },
        email: 'dual@example.com',
        emailVerified: true,
        provider: 'apple',
      };

      const tokens: OAuthTokens = {
        accessToken: 'apple_access_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleAppleSignIn(appleProfile, tokens);
      
      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(4);
      expect(result.user?.googleId).toBe('google999888');
      expect(result.user?.appleId).toBe('apple333444');
    });
  });

  describe('OAuth Token Generation', () => {
    it('should generate unique tokens for different users', async () => {
      const token1 = oauthService.generateToken(1);
      const token2 = oauthService.generateToken(2);
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1).toContain('jwt_token_1');
      expect(token2).toContain('jwt_token_2');
    });

    it('should generate tokens with timestamp for uniqueness', async () => {
      const token1 = oauthService.generateToken(1);
      
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const token2 = oauthService.generateToken(1);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('OAuth Error Handling', () => {
    it('should handle storage errors gracefully in Google sign-in', async () => {
      // Mock storage method to throw error
      const originalMethod = storage.getUserByGoogleId;
      storage.getUserByGoogleId = vi.fn().mockRejectedValue(new Error('Database error'));

      const googleProfile: GoogleProfile = {
        id: 'test_google_id',
        displayName: 'Test User',
        name: {
          familyName: 'User',
          givenName: 'Test',
        },
        emails: [
          {
            value: 'test@example.com',
            verified: true,
          },
        ],
        photos: [],
        provider: 'google',
      };

      const tokens: OAuthTokens = {
        accessToken: 'test_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleGoogleSignIn(googleProfile, tokens);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();

      // Restore original method
      storage.getUserByGoogleId = originalMethod;
    });

    it('should handle storage errors gracefully in Apple sign-in', async () => {
      // Mock storage method to throw error
      const originalMethod = storage.getUserByAppleId;
      storage.getUserByAppleId = vi.fn().mockRejectedValue(new Error('Database error'));

      const appleProfile: AppleProfile = {
        id: 'test_apple_id',
        displayName: 'Test User',
        name: {
          firstName: 'Test',
          lastName: 'User',
        },
        email: 'test@example.com',
        emailVerified: true,
        provider: 'apple',
      };

      const tokens: OAuthTokens = {
        accessToken: 'test_token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      };

      const result = await oauthService.handleAppleSignIn(appleProfile, tokens);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();

      // Restore original method
      storage.getUserByAppleId = originalMethod;
    });
  });
});