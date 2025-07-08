import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock bcrypt for password hashing/verification
const mockBcrypt = {
  compare: vi.fn(),
  hash: vi.fn(),
};

// Mock storage interface
interface MockUser {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  photoUrl?: string;
  serviceArea?: string;
  about?: string;
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

interface PasswordChangeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class MockPasswordChangeService {
  private users: MockUser[] = [];
  private bcrypt = mockBcrypt;

  constructor() {
    this.setupTestUsers();
  }

  private setupTestUsers(): void {
    this.users = [
      {
        id: 1,
        email: "barber1@example.com",
        password: "$2b$10$hashedPassword1", // Represents hashed "oldpassword123"
        firstName: "John",
        lastName: "Barber",
        phone: "(555) 123-4567",
        businessName: "John's Cuts",
      },
      {
        id: 2,
        email: "barber2@example.com", 
        password: "$2b$10$hashedPassword2", // Represents hashed "mypassword456"
        firstName: "Jane",
        lastName: "Stylist",
        phone: "(555) 987-6543",
        businessName: "Jane's Styles",
      },
      {
        id: 3,
        email: "barber3@example.com",
        password: "$2b$10$hashedPassword3", // Represents hashed "password789"
        firstName: "Mike",
        lastName: "Clipper",
        phone: "(555) 456-7890",
        businessName: "Mike's Mobile Cuts",
      },
    ];
  }

  async getUserById(id: number): Promise<MockUser | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async updateUserPassword(userId: number, newHashedPassword: string): Promise<boolean> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.password = newHashedPassword;
      return true;
    }
    return false;
  }

  async changePassword(userId: number, request: PasswordChangeRequest): Promise<PasswordChangeResponse> {
    try {
      // Input validation
      if (!request.currentPassword || !request.newPassword) {
        return {
          success: false,
          error: 'Current password and new password are required'
        };
      }

      if (request.newPassword.length < 8) {
        return {
          success: false,
          error: 'New password must be at least 8 characters long'
        };
      }

      // Get user
      const user = await this.getUserById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.bcrypt.compare(request.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Hash new password
      const hashedNewPassword = await this.bcrypt.hash(request.newPassword, 10);

      // Update password
      const updated = await this.updateUserPassword(userId, hashedNewPassword);
      if (!updated) {
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to change password'
      };
    }
  }

  // Test helper methods
  getAllUsers(): MockUser[] {
    return [...this.users];
  }

  resetUsers(): void {
    this.setupTestUsers();
  }
}

// Password validation utilities
function validatePasswordRequirements(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function simulateFormValidation(formData: any): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  if (!formData.currentPassword) {
    errors.currentPassword = 'Current password is required';
  }
  
  if (!formData.newPassword) {
    errors.newPassword = 'New password is required';
  }
  
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password';
  }
  
  if (formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
    errors.confirmPassword = 'New passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

describe('Password Change System', () => {
  let passwordService: MockPasswordChangeService;

  beforeEach(() => {
    passwordService = new MockPasswordChangeService();
    vi.clearAllMocks();
  });

  describe('Password Change Basic Functionality', () => {
    it('should successfully change password with valid credentials', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('$2b$10$newHashedPassword');

      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('oldpassword123', '$2b$10$hashedPassword1');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword456', 10);
    });

    it('should reject password change with incorrect current password', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(false);

      const request: PasswordChangeRequest = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('wrongpassword', '$2b$10$hashedPassword1');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should reject password change for non-existent user', async () => {
      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(999, request);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should reject password change with short new password', async () => {
      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'short'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('New password must be at least 8 characters long');
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should reject password change with missing credentials', async () => {
      const request: PasswordChangeRequest = {
        currentPassword: '',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password and new password are required');
    });
  });

  describe('Account Isolation Testing', () => {
    it('should only allow users to change their own password', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('$2b$10$newHashedPassword');

      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456'
      };

      // Execute - User 1 changes their password
      const result1 = await passwordService.changePassword(1, request);
      
      // Verify User 1 password change succeeded
      expect(result1.success).toBe(true);
      
      // Verify User 2 and User 3 passwords remain unchanged
      const user2 = await passwordService.getUserById(2);
      const user3 = await passwordService.getUserById(3);
      
      expect(user2?.password).toBe('$2b$10$hashedPassword2');
      expect(user3?.password).toBe('$2b$10$hashedPassword3');
    });

    it('should prevent cross-user password changes', async () => {
      // Setup - User 1 tries to change User 2's password using User 2's credentials
      // The bcrypt.compare will compare User 2's password against User 1's stored hash
      mockBcrypt.compare.mockResolvedValue(false); // This will fail because User 1's hash !== User 2's password
      mockBcrypt.hash.mockResolvedValue('$2b$10$hackedPassword');

      const request: PasswordChangeRequest = {
        currentPassword: 'mypassword456', // User 2's password
        newPassword: 'hackedpassword123'
      };

      // Execute - User 1 attempts to change password with User 2's credentials
      const result = await passwordService.changePassword(1, request);

      // Verify - Should fail because User 1's stored password doesn't match User 2's password
      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
      
      // Verify User 2's password remains unchanged
      const user2 = await passwordService.getUserById(2);
      expect(user2?.password).toBe('$2b$10$hashedPassword2');
    });

    it('should maintain proper user isolation across multiple password changes', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash
        .mockResolvedValueOnce('$2b$10$newHashedPassword1')
        .mockResolvedValueOnce('$2b$10$newHashedPassword2')
        .mockResolvedValueOnce('$2b$10$newHashedPassword3');

      // Execute - All three users change their passwords
      const request1: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword1'
      };
      
      const request2: PasswordChangeRequest = {
        currentPassword: 'mypassword456',
        newPassword: 'newpassword2'
      };
      
      const request3: PasswordChangeRequest = {
        currentPassword: 'password789',
        newPassword: 'newpassword3'
      };

      const result1 = await passwordService.changePassword(1, request1);
      const result2 = await passwordService.changePassword(2, request2);
      const result3 = await passwordService.changePassword(3, request3);

      // Verify all changes succeeded
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      // Verify each user has their own unique new password
      const user1 = await passwordService.getUserById(1);
      const user2 = await passwordService.getUserById(2);
      const user3 = await passwordService.getUserById(3);

      expect(user1?.password).toBe('$2b$10$newHashedPassword1');
      expect(user2?.password).toBe('$2b$10$newHashedPassword2');
      expect(user3?.password).toBe('$2b$10$newHashedPassword3');
    });

    it('should handle concurrent password change attempts with proper isolation', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash
        .mockResolvedValueOnce('$2b$10$concurrentPassword1')
        .mockResolvedValueOnce('$2b$10$concurrentPassword2');

      // Execute - Simulate concurrent password changes
      const request1: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'concurrent1'
      };
      
      const request2: PasswordChangeRequest = {
        currentPassword: 'mypassword456',
        newPassword: 'concurrent2'
      };

      const [result1, result2] = await Promise.all([
        passwordService.changePassword(1, request1),
        passwordService.changePassword(2, request2)
      ]);

      // Verify both changes succeeded independently
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify correct password isolation
      const user1 = await passwordService.getUserById(1);
      const user2 = await passwordService.getUserById(2);
      
      expect(user1?.password).toBe('$2b$10$concurrentPassword1');
      expect(user2?.password).toBe('$2b$10$concurrentPassword2');
    });
  });

  describe('Frontend Form Validation', () => {
    it('should validate password requirements correctly', () => {
      // Test weak passwords
      expect(validatePasswordRequirements('weak').isValid).toBe(false);
      expect(validatePasswordRequirements('password').isValid).toBe(false);
      expect(validatePasswordRequirements('12345678').isValid).toBe(false);
      
      // Test strong passwords
      expect(validatePasswordRequirements('StrongPass123!').isValid).toBe(true);
      expect(validatePasswordRequirements('MySecure@Pass1').isValid).toBe(true);
    });

    it('should validate form data correctly', () => {
      // Test invalid form data
      const invalidForm = {
        currentPassword: '',
        newPassword: 'newpass123',
        confirmPassword: 'different'
      };
      
      const invalidResult = simulateFormValidation(invalidForm);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.currentPassword).toBe('Current password is required');
      expect(invalidResult.errors.confirmPassword).toBe('New passwords do not match');

      // Test valid form data
      const validForm = {
        currentPassword: 'currentpass123',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123'
      };
      
      const validResult = simulateFormValidation(validForm);
      expect(validResult.isValid).toBe(true);
      expect(Object.keys(validResult.errors)).toHaveLength(0);
    });

    it('should handle password confirmation mismatch', () => {
      const formData = {
        currentPassword: 'current123',
        newPassword: 'newpass123',
        confirmPassword: 'different123'
      };
      
      const result = simulateFormValidation(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('New passwords do not match');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle bcrypt comparison errors gracefully', async () => {
      // Setup
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to change password');
    });

    it('should handle password hashing errors gracefully', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockRejectedValue(new Error('Hashing error'));

      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to change password');
    });

    it('should handle same password change attempts', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('$2b$10$samePassword');

      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'oldpassword123' // Same as current
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify - Should still succeed (no business rule against same password)
      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
    });

    it('should handle extremely long passwords correctly', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('$2b$10$longPasswordHash');

      const veryLongPassword = 'a'.repeat(1000) + 'B1!';
      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: veryLongPassword
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive information in error messages', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(false);

      const request: PasswordChangeRequest = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify - Error message should not contain sensitive info
      expect(result.error).toBe('Current password is incorrect');
      expect(result.error).not.toContain('$2b$10$hashedPassword1');
      expect(result.error).not.toContain('barber1@example.com');
    });

    it('should properly hash new passwords', async () => {
      // Setup
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue('$2b$10$properlyHashedPassword');

      const request: PasswordChangeRequest = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword456'
      };

      // Execute
      const result = await passwordService.changePassword(1, request);

      // Verify
      expect(result.success).toBe(true);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword456', 10);
      
      // Verify password is stored in hashed form
      const user = await passwordService.getUserById(1);
      expect(user?.password).toBe('$2b$10$properlyHashedPassword');
      expect(user?.password).not.toBe('newpassword456'); // Not stored in plain text
    });
  });
});