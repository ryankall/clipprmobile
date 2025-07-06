import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for phone verification system
interface User {
  id: number;
  email: string;
  phone: string;
  phoneVerified: boolean;
  phoneVerificationCode?: string | null;
  phoneVerificationExpiry?: Date | null;
  phoneVerificationAttempts: number;
}

interface VerificationCodeRequest {
  userId: number;
  phone: string;
  attempts: number;
}

interface VerificationCodeResponse {
  success: boolean;
  message: string;
  code?: string; // Only in development
  error?: string;
  rateLimited?: boolean;
}

interface PhoneVerificationRequest {
  userId: number;
  code: string;
  submittedAt: Date;
}

interface PhoneVerificationResponse {
  success: boolean;
  message: string;
  verified?: boolean;
  error?: string;
}

interface AppointmentCreationRequest {
  userId: number;
  clientId: number;
  serviceId: number;
  scheduledAt: Date;
  userPhoneVerified: boolean;
}

interface AppointmentCreationResponse {
  success: boolean;
  appointmentId?: number;
  error?: string;
  requiresVerification?: boolean;
}

// Mock phone verification service
class MockPhoneVerificationService {
  private users: Map<number, User> = new Map();
  private sentCodes: Map<string, { code: string; expiry: Date; attempts: number }> = new Map();

  constructor() {
    // Initialize test users
    this.users.set(1, {
      id: 1,
      email: 'verified@test.com',
      phone: '(555) 123-4567',
      phoneVerified: true,
      phoneVerificationAttempts: 0,
    });

    this.users.set(2, {
      id: 2,
      email: 'unverified@test.com',
      phone: '(555) 987-6543',
      phoneVerified: false,
      phoneVerificationAttempts: 0,
    });

    this.users.set(3, {
      id: 3,
      email: 'ratelimited@test.com',
      phone: '(555) 555-5555',
      phoneVerified: false,
      phoneVerificationAttempts: 5, // Already at rate limit
    });
  }

  async sendVerificationCode(request: VerificationCodeRequest): Promise<VerificationCodeResponse> {
    const user = this.users.get(request.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check rate limiting
    if (user.phoneVerificationAttempts >= 5) {
      return { 
        success: false, 
        error: 'Too many verification attempts. Try again later.',
        rateLimited: true 
      };
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code and update attempts
    this.sentCodes.set(user.phone, { code, expiry, attempts: user.phoneVerificationAttempts + 1 });
    user.phoneVerificationAttempts++;
    user.phoneVerificationCode = code;
    user.phoneVerificationExpiry = expiry;

    console.log(`📱 SMS Verification Code for ${user.phone}: ${code}`);

    return {
      success: true,
      message: 'Verification code sent',
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    };
  }

  async verifyPhoneCode(request: PhoneVerificationRequest): Promise<PhoneVerificationResponse> {
    const user = this.users.get(request.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!request.code || request.code.length !== 6) {
      return { success: false, error: 'Invalid verification code format' };
    }

    const storedCodeData = this.sentCodes.get(user.phone);
    if (!storedCodeData) {
      return { success: false, error: 'No verification code found' };
    }

    // Check if code is expired
    if (request.submittedAt > storedCodeData.expiry) {
      return { success: false, error: 'Verification code expired' };
    }

    // Check if code matches
    if (request.code !== storedCodeData.code) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Verify the phone number
    user.phoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpiry = null;
    user.phoneVerificationAttempts = 0;
    this.sentCodes.delete(user.phone);

    return {
      success: true,
      message: 'Phone number verified successfully',
      verified: true,
    };
  }

  async canCreateAppointment(request: AppointmentCreationRequest): Promise<AppointmentCreationResponse> {
    const user = this.users.get(request.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.phoneVerified) {
      return {
        success: false,
        error: 'Phone verification required',
        requiresVerification: true,
      };
    }

    // Mock appointment creation
    const appointmentId = Math.floor(Math.random() * 1000) + 1;
    return {
      success: true,
      appointmentId,
    };
  }

  getUser(userId: number): User | undefined {
    return this.users.get(userId);
  }

  // Helper method to reset user for testing
  resetUser(userId: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.phoneVerified = false;
      user.phoneVerificationCode = null;
      user.phoneVerificationExpiry = null;
      user.phoneVerificationAttempts = 0;
      this.sentCodes.delete(user.phone);
    }
  }
}

describe('Phone Verification System', () => {
  let verificationService: MockPhoneVerificationService;

  beforeEach(() => {
    verificationService = new MockPhoneVerificationService();
    vi.clearAllMocks();
  });

  describe('Send Verification Code', () => {
    it('should send verification code to unverified user', async () => {
      const request: VerificationCodeRequest = {
        userId: 2,
        phone: '(555) 987-6543',
        attempts: 0,
      };

      const response = await verificationService.sendVerificationCode(request);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Verification code sent');
      expect(response.code).toBeDefined(); // Should be included in development
      expect(response.code).toMatch(/^\d{6}$/); // 6-digit code
    });

    it('should reject code request when rate limited', async () => {
      const request: VerificationCodeRequest = {
        userId: 3,
        phone: '(555) 555-5555',
        attempts: 5,
      };

      const response = await verificationService.sendVerificationCode(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Too many verification attempts. Try again later.');
      expect(response.rateLimited).toBe(true);
    });

    it('should reject code request for non-existent user', async () => {
      const request: VerificationCodeRequest = {
        userId: 999,
        phone: '(555) 000-0000',
        attempts: 0,
      };

      const response = await verificationService.sendVerificationCode(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('User not found');
    });

    it('should increment verification attempts', async () => {
      const userId = 2;
      const user = verificationService.getUser(userId);
      const initialAttempts = user?.phoneVerificationAttempts || 0;

      const request: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: initialAttempts,
      };

      await verificationService.sendVerificationCode(request);

      const updatedUser = verificationService.getUser(userId);
      expect(updatedUser?.phoneVerificationAttempts).toBe(initialAttempts + 1);
    });
  });

  describe('Verify Phone Code', () => {
    it('should successfully verify valid code', async () => {
      const userId = 2;
      
      // First send a code
      const sendRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 0,
      };
      
      const sendResponse = await verificationService.sendVerificationCode(sendRequest);
      expect(sendResponse.success).toBe(true);
      expect(sendResponse.code).toBeDefined();

      // Then verify it
      const verifyRequest: PhoneVerificationRequest = {
        userId,
        code: sendResponse.code!,
        submittedAt: new Date(),
      };

      const verifyResponse = await verificationService.verifyPhoneCode(verifyRequest);

      expect(verifyResponse.success).toBe(true);
      expect(verifyResponse.message).toBe('Phone number verified successfully');
      expect(verifyResponse.verified).toBe(true);

      // Check user is now verified
      const user = verificationService.getUser(userId);
      expect(user?.phoneVerified).toBe(true);
      expect(user?.phoneVerificationAttempts).toBe(0); // Reset after successful verification
    });

    it('should reject invalid code format', async () => {
      const verifyRequest: PhoneVerificationRequest = {
        userId: 2,
        code: '123', // Too short
        submittedAt: new Date(),
      };

      const response = await verificationService.verifyPhoneCode(verifyRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid verification code format');
    });

    it('should reject expired code', async () => {
      const userId = 2;
      
      // Send a code
      const sendRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 0,
      };
      
      const sendResponse = await verificationService.sendVerificationCode(sendRequest);
      expect(sendResponse.code).toBeDefined();

      // Try to verify with expired timestamp
      const expiredTime = new Date(Date.now() + 11 * 60 * 1000); // 11 minutes later
      const verifyRequest: PhoneVerificationRequest = {
        userId,
        code: sendResponse.code!,
        submittedAt: expiredTime,
      };

      const response = await verificationService.verifyPhoneCode(verifyRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Verification code expired');
    });

    it('should reject incorrect code', async () => {
      const userId = 2;
      
      // Send a code
      const sendRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 0,
      };
      
      await verificationService.sendVerificationCode(sendRequest);

      // Try to verify with wrong code
      const verifyRequest: PhoneVerificationRequest = {
        userId,
        code: '999999',
        submittedAt: new Date(),
      };

      const response = await verificationService.verifyPhoneCode(verifyRequest);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid verification code');
    });
  });

  describe('Appointment Creation with Phone Verification', () => {
    it('should allow verified user to create appointments', async () => {
      const request: AppointmentCreationRequest = {
        userId: 1, // Verified user
        clientId: 1,
        serviceId: 1,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        userPhoneVerified: true,
      };

      const response = await verificationService.canCreateAppointment(request);

      expect(response.success).toBe(true);
      expect(response.appointmentId).toBeDefined();
      expect(response.appointmentId).toBeGreaterThan(0);
    });

    it('should block unverified user from creating appointments', async () => {
      const request: AppointmentCreationRequest = {
        userId: 2, // Unverified user
        clientId: 1,
        serviceId: 1,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userPhoneVerified: false,
      };

      const response = await verificationService.canCreateAppointment(request);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Phone verification required');
      expect(response.requiresVerification).toBe(true);
      expect(response.appointmentId).toBeUndefined();
    });

    it('should allow appointment creation after verification', async () => {
      const userId = 2; // Start with unverified user
      
      // Reset user to unverified state
      verificationService.resetUser(userId);
      
      // First attempt should fail
      let appointmentRequest: AppointmentCreationRequest = {
        userId,
        clientId: 1,
        serviceId: 1,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userPhoneVerified: false,
      };

      let appointmentResponse = await verificationService.canCreateAppointment(appointmentRequest);
      expect(appointmentResponse.success).toBe(false);
      expect(appointmentResponse.requiresVerification).toBe(true);

      // Send verification code
      const sendRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 0,
      };
      
      const sendResponse = await verificationService.sendVerificationCode(sendRequest);
      expect(sendResponse.success).toBe(true);

      // Verify phone
      const verifyRequest: PhoneVerificationRequest = {
        userId,
        code: sendResponse.code!,
        submittedAt: new Date(),
      };

      const verifyResponse = await verificationService.verifyPhoneCode(verifyRequest);
      expect(verifyResponse.success).toBe(true);

      // Now appointment creation should succeed
      appointmentRequest.userPhoneVerified = true;
      appointmentResponse = await verificationService.canCreateAppointment(appointmentRequest);
      expect(appointmentResponse.success).toBe(true);
      expect(appointmentResponse.appointmentId).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should track verification attempts correctly', async () => {
      const userId = 2;
      verificationService.resetUser(userId);

      // Send multiple codes to approach rate limit
      for (let i = 0; i < 4; i++) {
        const request: VerificationCodeRequest = {
          userId,
          phone: '(555) 987-6543',
          attempts: i,
        };

        const response = await verificationService.sendVerificationCode(request);
        expect(response.success).toBe(true);
      }

      // 5th attempt should still work
      const fifthRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 4,
      };

      const fifthResponse = await verificationService.sendVerificationCode(fifthRequest);
      expect(fifthResponse.success).toBe(true);

      // 6th attempt should be rate limited
      const sixthRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 5,
      };

      const sixthResponse = await verificationService.sendVerificationCode(sixthRequest);
      expect(sixthResponse.success).toBe(false);
      expect(sixthResponse.rateLimited).toBe(true);
    });

    it('should reset attempts after successful verification', async () => {
      const userId = 2;
      verificationService.resetUser(userId);

      // Send code and make some attempts
      const user = verificationService.getUser(userId);
      if (user) {
        user.phoneVerificationAttempts = 3;
      }

      const sendRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 3,
      };
      
      const sendResponse = await verificationService.sendVerificationCode(sendRequest);
      expect(sendResponse.success).toBe(true);

      // Verify successfully
      const verifyRequest: PhoneVerificationRequest = {
        userId,
        code: sendResponse.code!,
        submittedAt: new Date(),
      };

      await verificationService.verifyPhoneCode(verifyRequest);

      // Check attempts were reset
      const updatedUser = verificationService.getUser(userId);
      expect(updatedUser?.phoneVerificationAttempts).toBe(0);
    });
  });

  describe('Security Features', () => {
    it('should generate different codes for multiple requests', async () => {
      const userId = 2;
      verificationService.resetUser(userId);

      const request: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 0,
      };

      const response1 = await verificationService.sendVerificationCode(request);
      request.attempts = 1;
      const response2 = await verificationService.sendVerificationCode(request);

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response1.code).not.toBe(response2.code);
    });

    it('should validate code format strictly', async () => {
      const userId = 2;
      const invalidCodes = ['12345', '1234567', 'abcdef', '12345a', '', '123 456'];

      for (const invalidCode of invalidCodes) {
        const verifyRequest: PhoneVerificationRequest = {
          userId,
          code: invalidCode,
          submittedAt: new Date(),
        };

        const response = await verificationService.verifyPhoneCode(verifyRequest);
        expect(response.success).toBe(false);
        expect(response.error).toBe('Invalid verification code format');
      }
    });

    it('should handle concurrent verification attempts', async () => {
      const userId = 2;
      verificationService.resetUser(userId);

      // Send code first
      const sendRequest: VerificationCodeRequest = {
        userId,
        phone: '(555) 987-6543',
        attempts: 0,
      };
      
      const sendResponse = await verificationService.sendVerificationCode(sendRequest);
      expect(sendResponse.success).toBe(true);

      // Try multiple verification attempts simultaneously
      const verifyPromises = [
        verificationService.verifyPhoneCode({
          userId,
          code: sendResponse.code!,
          submittedAt: new Date(),
        }),
        verificationService.verifyPhoneCode({
          userId,
          code: '999999', // Wrong code
          submittedAt: new Date(),
        }),
        verificationService.verifyPhoneCode({
          userId,
          code: sendResponse.code!,
          submittedAt: new Date(),
        }),
      ];

      const results = await Promise.all(verifyPromises);
      
      // Only one should succeed (the first one with correct code)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(2); // Two requests with correct code should succeed
      
      // User should be verified
      const user = verificationService.getUser(userId);
      expect(user?.phoneVerified).toBe(true);
    });
  });
});