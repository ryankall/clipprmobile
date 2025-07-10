import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock React Query
const mockInvalidateQueries = vi.fn();
const mockQueryClient = {
  invalidateQueries: mockInvalidateQueries
};

// Mock useQuery hook
const mockUseQuery = vi.fn();

// Mock useMutation hook
const mockUseMutation = vi.fn();

// Mock toast
const mockToast = vi.fn();

// Mock apiRequest
const mockApiRequest = vi.fn();

// Mock React Hook Form
const mockUseForm = vi.fn();

// Mock component state
let mockUser: any = null;
let mockIsCodeSent = false;
let mockVerificationCode = '';

// Mock React hooks
const mockUseState = vi.fn();
const mockUseEffect = vi.fn();

// Mock phone verification service
class MockPhoneVerificationService {
  private verificationCodes: Map<string, {
    code: string;
    expiresAt: Date;
    attempts: number;
  }> = new Map();

  private users: Map<string, {
    id: number;
    phone: string;
    phone_verified: boolean;
    phoneVerificationCode?: string;
    phoneVerificationExpiry?: Date;
    phoneVerificationAttempts?: number;
  }> = new Map();

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // User with unverified phone
    this.users.set('1', {
      id: 1,
      phone: '(347) 942-5309',
      phone_verified: false,
      phoneVerificationAttempts: 0
    });

    // User with verified phone
    this.users.set('2', {
      id: 2,
      phone: '(646) 789-1820',
      phone_verified: true,
      phoneVerificationAttempts: 0
    });
  }

  async sendVerificationCode(userId: string): Promise<{
    success: boolean;
    code?: string;
    developerNote?: string;
    message: string;
  }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.phoneVerificationAttempts && user.phoneVerificationAttempts >= 5) {
      throw new Error('Too many verification attempts');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.verificationCodes.set(userId, {
      code,
      expiresAt,
      attempts: (user.phoneVerificationAttempts || 0) + 1
    });

    // Update user attempts
    user.phoneVerificationCode = code;
    user.phoneVerificationExpiry = expiresAt;
    user.phoneVerificationAttempts = (user.phoneVerificationAttempts || 0) + 1;

    return {
      success: true,
      code, // Development mode
      developerNote: `Development mode: Use code ${code} to verify your phone`,
      message: 'Verification code sent'
    };
  }

  async verifyPhone(userId: string, code: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const verification = this.verificationCodes.get(userId);
    if (!verification) {
      throw new Error('No verification code found');
    }

    if (verification.expiresAt < new Date()) {
      throw new Error('Verification code expired');
    }

    if (verification.code !== code) {
      throw new Error('Invalid verification code');
    }

    // Verify the phone
    user.phone_verified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpiry = undefined;
    user.phoneVerificationAttempts = 0;

    // Clear verification data
    this.verificationCodes.delete(userId);

    return {
      success: true,
      message: 'Phone number verified successfully'
    };
  }

  getUser(userId: string): any {
    return this.users.get(userId);
  }

  isPhoneVerified(userId: string): boolean {
    const user = this.users.get(userId);
    return user?.phone_verified || false;
  }

  // Test utilities
  clearVerificationData(): void {
    this.verificationCodes.clear();
    this.users.forEach(user => {
      user.phone_verified = false;
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpiry = undefined;
      user.phoneVerificationAttempts = 0;
    });
  }

  simulateTimeAdvance(minutes: number): void {
    const now = new Date();
    this.verificationCodes.forEach((verification, userId) => {
      verification.expiresAt = new Date(verification.expiresAt.getTime() - (minutes * 60 * 1000));
    });
  }
}

// Mock UI state management
class MockPhoneVerificationUI {
  private phoneVerificationService: MockPhoneVerificationService;
  private currentUser: any = null;
  private isCodeSent = false;
  private verificationCode = '';
  private isVerifyingPhone = false;

  constructor(service: MockPhoneVerificationService) {
    this.phoneVerificationService = service;
  }

  setCurrentUser(userId: string): void {
    this.currentUser = this.phoneVerificationService.getUser(userId);
  }

  isPhoneVerified(): boolean {
    return this.currentUser?.phone_verified || false;
  }

  async sendVerificationCode(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    const result = await this.phoneVerificationService.sendVerificationCode(this.currentUser.id.toString());
    
    if (result.success) {
      this.isCodeSent = true;
      // In development mode, the code is available
      console.log(`Development code: ${result.code}`);
    }
  }

  async verifyPhone(code: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    const result = await this.phoneVerificationService.verifyPhone(this.currentUser.id.toString(), code);
    
    if (result.success) {
      // Update current user state
      this.currentUser.phone_verified = true;
      this.isCodeSent = false;
      this.verificationCode = '';
      this.isVerifyingPhone = false;
      
      // Simulate query invalidation
      mockInvalidateQueries({ queryKey: ['/api/user/profile'] });
    }
  }

  getUIState(): {
    isPhoneVerified: boolean;
    isCodeSent: boolean;
    verificationCode: string;
    isVerifyingPhone: boolean;
    phone: string;
  } {
    return {
      isPhoneVerified: this.isPhoneVerified(),
      isCodeSent: this.isCodeSent,
      verificationCode: this.verificationCode,
      isVerifyingPhone: this.isVerifyingPhone,
      phone: this.currentUser?.phone || ''
    };
  }

  setVerificationCode(code: string): void {
    this.verificationCode = code;
  }

  setIsVerifyingPhone(verifying: boolean): void {
    this.isVerifyingPhone = verifying;
  }
}

describe('Phone Verification UI Update', () => {
  let phoneVerificationUI: MockPhoneVerificationUI;
  let phoneVerificationService: MockPhoneVerificationService;

  beforeEach(() => {
    phoneVerificationService = new MockPhoneVerificationService();
    phoneVerificationUI = new MockPhoneVerificationUI(phoneVerificationService);
    mockInvalidateQueries.mockClear();
  });

  describe('UI State Before Verification', () => {
    it('should show unverified state for new user', () => {
      phoneVerificationUI.setCurrentUser('1');
      const uiState = phoneVerificationUI.getUIState();
      
      expect(uiState.isPhoneVerified).toBe(false);
      expect(uiState.isCodeSent).toBe(false);
      expect(uiState.phone).toBe('(347) 942-5309');
    });

    it('should show verified state for already verified user', () => {
      phoneVerificationUI.setCurrentUser('2');
      const uiState = phoneVerificationUI.getUIState();
      
      expect(uiState.isPhoneVerified).toBe(true);
      expect(uiState.isCodeSent).toBe(false);
      expect(uiState.phone).toBe('(646) 789-1820');
    });

    it('should show verification warning for unverified users', () => {
      phoneVerificationUI.setCurrentUser('1');
      const uiState = phoneVerificationUI.getUIState();
      
      expect(uiState.isPhoneVerified).toBe(false);
      // Should show warning UI elements
      expect(uiState.isCodeSent).toBe(false);
    });
  });

  describe('Send Verification Code Flow', () => {
    it('should send verification code and update UI state', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      await phoneVerificationUI.sendVerificationCode();
      const uiState = phoneVerificationUI.getUIState();
      
      expect(uiState.isCodeSent).toBe(true);
      expect(uiState.isPhoneVerified).toBe(false);
    });

    it('should show development code in development mode', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      const result = await phoneVerificationService.sendVerificationCode('1');
      
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.developerNote).toContain('Development mode');
    });

    it('should handle rate limiting properly', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      // Send 5 codes (rate limit)
      for (let i = 0; i < 5; i++) {
        await phoneVerificationService.sendVerificationCode('1');
      }
      
      // 6th attempt should fail
      await expect(phoneVerificationService.sendVerificationCode('1')).rejects.toThrow('Too many verification attempts');
    });
  });

  describe('Phone Verification Flow', () => {
    it('should verify phone and update UI state to verified', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      // Send code
      const sendResult = await phoneVerificationService.sendVerificationCode('1');
      expect(sendResult.success).toBe(true);
      
      // Verify with correct code
      await phoneVerificationUI.verifyPhone(sendResult.code!);
      
      const uiState = phoneVerificationUI.getUIState();
      expect(uiState.isPhoneVerified).toBe(true);
      expect(uiState.isCodeSent).toBe(false);
      expect(uiState.verificationCode).toBe('');
    });

    it('should invalidate user profile query after successful verification', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      const sendResult = await phoneVerificationService.sendVerificationCode('1');
      await phoneVerificationUI.verifyPhone(sendResult.code!);
      
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['/api/user/profile'] });
    });

    it('should handle invalid verification code', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      await phoneVerificationService.sendVerificationCode('1');
      
      await expect(phoneVerificationUI.verifyPhone('000000')).rejects.toThrow('Invalid verification code');
    });

    it('should handle expired verification code', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      await phoneVerificationService.sendVerificationCode('1');
      
      // Simulate time advance (11 minutes)
      phoneVerificationService.simulateTimeAdvance(11);
      
      await expect(phoneVerificationUI.verifyPhone('123456')).rejects.toThrow('Verification code expired');
    });
  });

  describe('UI State After Verification', () => {
    it('should show verified status in UI after successful verification', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      // Before verification
      let uiState = phoneVerificationUI.getUIState();
      expect(uiState.isPhoneVerified).toBe(false);
      
      // Complete verification flow
      const sendResult = await phoneVerificationService.sendVerificationCode('1');
      await phoneVerificationUI.verifyPhone(sendResult.code!);
      
      // After verification
      uiState = phoneVerificationUI.getUIState();
      expect(uiState.isPhoneVerified).toBe(true);
      expect(uiState.isCodeSent).toBe(false);
      expect(uiState.isVerifyingPhone).toBe(false);
    });

    it('should not show verification warning after successful verification', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      // Complete verification
      const sendResult = await phoneVerificationService.sendVerificationCode('1');
      await phoneVerificationUI.verifyPhone(sendResult.code!);
      
      const uiState = phoneVerificationUI.getUIState();
      expect(uiState.isPhoneVerified).toBe(true);
      
      // Should not show warning elements
      expect(uiState.isCodeSent).toBe(false);
      expect(uiState.isVerifyingPhone).toBe(false);
    });

    it('should show green checkmark for verified phone', async () => {
      phoneVerificationUI.setCurrentUser('1');
      
      // Complete verification
      const sendResult = await phoneVerificationService.sendVerificationCode('1');
      await phoneVerificationUI.verifyPhone(sendResult.code!);
      
      const uiState = phoneVerificationUI.getUIState();
      expect(uiState.isPhoneVerified).toBe(true);
      
      // UI should show verified status
      expect(uiState.isPhoneVerified).toBe(true);
    });
  });

  describe('Database Schema Consistency', () => {
    it('should use phone_verified (snake_case) field consistently', () => {
      const user = phoneVerificationService.getUser('1');
      expect(user).toHaveProperty('phone_verified');
      expect(typeof user.phone_verified).toBe('boolean');
    });

    it('should update phone_verified field after verification', async () => {
      const sendResult = await phoneVerificationService.sendVerificationCode('1');
      await phoneVerificationService.verifyPhone('1', sendResult.code!);
      
      const user = phoneVerificationService.getUser('1');
      expect(user.phone_verified).toBe(true);
    });

    it('should clear verification fields after successful verification', async () => {
      const sendResult = await phoneVerificationService.sendVerificationCode('1');
      await phoneVerificationService.verifyPhone('1', sendResult.code!);
      
      const user = phoneVerificationService.getUser('1');
      expect(user.phoneVerificationCode).toBeUndefined();
      expect(user.phoneVerificationExpiry).toBeUndefined();
      expect(user.phoneVerificationAttempts).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user gracefully', async () => {
      await expect(phoneVerificationService.sendVerificationCode('999')).rejects.toThrow('User not found');
    });

    it('should handle verification without sending code first', async () => {
      await expect(phoneVerificationService.verifyPhone('1', '123456')).rejects.toThrow('No verification code found');
    });

    it('should handle malformed verification codes', async () => {
      await phoneVerificationService.sendVerificationCode('1');
      await expect(phoneVerificationService.verifyPhone('1', '123')).rejects.toThrow('Invalid verification code');
    });
  });

  describe('Development Mode Features', () => {
    it('should return verification code in development mode', async () => {
      const result = await phoneVerificationService.sendVerificationCode('1');
      
      expect(result.code).toBeDefined();
      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.developerNote).toContain('Development mode');
    });

    it('should log verification code for development testing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      phoneVerificationUI.setCurrentUser('1');
      await phoneVerificationUI.sendVerificationCode();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Development code:'));
      
      consoleSpy.mockRestore();
    });
  });
});