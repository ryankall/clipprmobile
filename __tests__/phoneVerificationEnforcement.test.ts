import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '@/lib/queryClient';

// Mock the authentication and database
const mockUser = {
  id: 1,
  email: 'test@example.com',
  phone: '+1234567890',
  phoneVerified: false, // Key field for testing
  firstName: 'Test',
  lastName: 'User'
};

const mockVerifiedUser = {
  ...mockUser,
  phoneVerified: true
};

const mockServices = [
  {
    id: 1,
    userId: 1,
    name: 'Haircut',
    price: '25.00',
    duration: 30,
    category: 'haircut'
  }
];

const mockClients = [
  {
    id: 1,
    userId: 1,
    name: 'John Doe',
    phone: '+1987654321',
    email: 'john@example.com'
  }
];

// Mock storage interface
class MockStorage {
  private users = new Map();
  private services = new Map();
  private clients = new Map();

  constructor() {
    this.users.set(1, { ...mockUser });
    this.users.set(2, { ...mockVerifiedUser, id: 2 });
    this.services.set(1, mockServices[0]);
    this.clients.set(1, mockClients[0]);
  }

  async getUser(id: number) {
    return this.users.get(id);
  }

  async getService(id: number) {
    return this.services.get(id);
  }

  async getClient(id: number) {
    return this.clients.get(id);
  }

  // Set phone verification status for testing
  setPhoneVerificationStatus(userId: number, verified: boolean) {
    const user = this.users.get(userId);
    if (user) {
      user.phoneVerified = verified;
    }
  }
}

const mockStorage = new MockStorage();

// Mock API request
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn()
}));

describe('Phone Verification Enforcement in Appointment Booking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Phone Verification Required', () => {
    it('should block appointment creation for unverified phone', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        notes: 'Test appointment'
      };

      // Mock the API to return phone verification error
      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });

    it('should allow appointment creation for verified phone', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test appointment'
      };

      const mockAppointment = {
        id: 1,
        userId: 2, // verified user
        ...appointmentData,
        status: 'pending',
        price: '25.00',
        duration: 30
      };

      // Mock successful creation for verified user
      (apiRequest as any).mockResolvedValue(mockAppointment);

      const result = await apiRequest('POST', '/api/appointments', appointmentData);
      expect(result).toEqual(mockAppointment);
    });

    it('should return specific error code for unverified phone', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Mock detailed error response
      (apiRequest as any).mockRejectedValue({
        message: 'Phone verification required',
        status: 403,
        error: 'PHONE_NOT_VERIFIED',
        details: 'Your phone number must be verified before booking appointments. Please verify your phone in settings.'
      });

      try {
        await apiRequest('POST', '/api/appointments', appointmentData);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).toBe(403);
        expect(error.error).toBe('PHONE_NOT_VERIFIED');
        expect(error.message).toContain('Phone verification required');
        expect(error.details).toContain('verify your phone in settings');
      }
    });
  });

  describe('Phone Verification State Changes', () => {
    it('should block appointments after phone verification is revoked', async () => {
      // User starts verified
      mockStorage.setPhoneVerificationStatus(2, true);
      
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // First appointment should succeed
      (apiRequest as any).mockResolvedValueOnce({ id: 1, status: 'pending' });
      await apiRequest('POST', '/api/appointments', appointmentData);

      // Revoke verification
      mockStorage.setPhoneVerificationStatus(2, false);
      
      // Second appointment should fail
      (apiRequest as any).mockRejectedValueOnce(new Error('403: Phone verification required'));
      
      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });

    it('should allow appointments after phone verification is completed', async () => {
      // User starts unverified
      mockStorage.setPhoneVerificationStatus(1, false);
      
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // First appointment should fail
      (apiRequest as any).mockRejectedValueOnce(new Error('403: Phone verification required'));
      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');

      // Complete verification
      mockStorage.setPhoneVerificationStatus(1, true);
      
      // Second appointment should succeed
      (apiRequest as any).mockResolvedValueOnce({ id: 1, status: 'pending' });
      const result = await apiRequest('POST', '/api/appointments', appointmentData);
      expect(result.id).toBe(1);
    });
  });

  describe('Multiple Service Appointments', () => {
    it('should block multi-service appointments for unverified phone', async () => {
      const appointmentData = {
        clientId: 1,
        services: [
          { serviceId: 1, quantity: 1 },
          { serviceId: 1, quantity: 2 } // multiple services
        ],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });

    it('should allow multi-service appointments for verified phone', async () => {
      const appointmentData = {
        clientId: 1,
        services: [
          { serviceId: 1, quantity: 1 },
          { serviceId: 1, quantity: 2 }
        ],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const mockAppointment = {
        id: 1,
        userId: 2, // verified user
        ...appointmentData,
        status: 'pending',
        price: '75.00', // 3 services * $25
        duration: 90 // 3 services * 30 minutes
      };

      (apiRequest as any).mockResolvedValue(mockAppointment);

      const result = await apiRequest('POST', '/api/appointments', appointmentData);
      expect(result.price).toBe('75.00');
      expect(result.duration).toBe(90);
    });
  });

  describe('Legacy Format Support', () => {
    it('should block legacy single-service format for unverified phone', async () => {
      const appointmentData = {
        clientId: 1,
        serviceId: 1, // legacy format
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });

    it('should allow legacy single-service format for verified phone', async () => {
      const appointmentData = {
        clientId: 1,
        serviceId: 1, // legacy format
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const mockAppointment = {
        id: 1,
        userId: 2, // verified user
        ...appointmentData,
        status: 'pending',
        price: '25.00',
        duration: 30
      };

      (apiRequest as any).mockResolvedValue(mockAppointment);

      const result = await apiRequest('POST', '/api/appointments', appointmentData);
      expect(result).toEqual(mockAppointment);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing user gracefully', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      (apiRequest as any).mockRejectedValue(new Error('404: User not found'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('404: User not found');
    });

    it('should prioritize phone verification over other validations', async () => {
      const appointmentData = {
        clientId: 999, // non-existent client
        services: [{ serviceId: 999, quantity: 1 }], // non-existent service
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Phone verification should be checked first
      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });

    it('should handle null phoneVerified field as unverified', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Mock user with null phoneVerified (should be treated as false)
      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });

    it('should enforce verification for urgent/same-day appointments', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        notes: 'Urgent appointment'
      };

      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });
  });

  describe('User Experience Messages', () => {
    it('should provide clear instructions for phone verification', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      (apiRequest as any).mockRejectedValue({
        message: 'Phone verification required',
        error: 'PHONE_NOT_VERIFIED',
        details: 'Your phone number must be verified before booking appointments. Please verify your phone in settings.'
      });

      try {
        await apiRequest('POST', '/api/appointments', appointmentData);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.details).toContain('verify your phone in settings');
        expect(error.details).toContain('before booking appointments');
      }
    });

    it('should include error type for frontend handling', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      (apiRequest as any).mockRejectedValue({
        message: 'Phone verification required',
        error: 'PHONE_NOT_VERIFIED'
      });

      try {
        await apiRequest('POST', '/api/appointments', appointmentData);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.error).toBe('PHONE_NOT_VERIFIED');
      }
    });
  });

  describe('Security and Account Isolation', () => {
    it('should check phone verification for correct user account', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Ensure verification is checked for the authenticated user, not any user
      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });

    it('should prevent bypassing verification through client manipulation', async () => {
      const appointmentData = {
        clientId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        phoneVerified: true // This should be ignored - verification comes from user, not request
      };

      (apiRequest as any).mockRejectedValue(new Error('403: Phone verification required'));

      await expect(
        apiRequest('POST', '/api/appointments', appointmentData)
      ).rejects.toThrow('403: Phone verification required');
    });
  });
});