import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiRequest
const mockApiRequest = vi.fn();

// Mock storage
const mockStorage = vi.fn();

// Mock user data
interface MockUser {
  id: number;
  email: string;
  phone: string;
  phoneVerified: boolean;
  businessName?: string;
  createdAt: string;
}

interface MockClient {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

interface MockService {
  id: number;
  userId: number;
  name: string;
  price: string;
  duration: number;
  category: string;
  isActive: boolean;
}

interface MockAppointment {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  duration: number;
  createdAt: Date;
}

interface AppointmentRequest {
  clientId: number;
  scheduledAt: string;
  services: Array<{
    serviceId: number;
    quantity: number;
  }>;
  message?: string;
  travelRequired?: boolean;
  address?: string;
}

// Mock appointment creation service
class MockAppointmentCreationService {
  private users: Map<number, MockUser> = new Map();
  private clients: Map<number, MockClient> = new Map();
  private services: Map<number, MockService> = new Map();
  private appointments: Map<number, MockAppointment> = new Map();
  private nextId = 1;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // User with verified phone
    this.users.set(1, {
      id: 1,
      email: 'verified@example.com',
      phone: '(347) 942-5309',
      phoneVerified: true,
      businessName: 'Verified Cuts',
      createdAt: new Date().toISOString()
    });

    // User with unverified phone
    this.users.set(2, {
      id: 2,
      email: 'unverified@example.com',
      phone: '(646) 789-1820',
      phoneVerified: false,
      businessName: 'Unverified Cuts',
      createdAt: new Date().toISOString()
    });

    // User without phone
    this.users.set(3, {
      id: 3,
      email: 'nophone@example.com',
      phone: '',
      phoneVerified: false,
      businessName: 'No Phone Cuts',
      createdAt: new Date().toISOString()
    });

    // Mock clients
    this.clients.set(1, {
      id: 1,
      userId: 1,
      name: 'John Doe',
      phone: '(555) 123-4567',
      email: 'john@example.com',
      createdAt: new Date().toISOString()
    });

    this.clients.set(2, {
      id: 2,
      userId: 2,
      name: 'Jane Smith',
      phone: '(555) 987-6543',
      email: 'jane@example.com',
      createdAt: new Date().toISOString()
    });

    // Mock services
    this.services.set(1, {
      id: 1,
      userId: 1,
      name: 'Haircut',
      price: '25.00',
      duration: 30,
      category: 'haircuts',
      isActive: true
    });

    this.services.set(2, {
      id: 2,
      userId: 2,
      name: 'Beard Trim',
      price: '15.00',
      duration: 20,
      category: 'beard',
      isActive: true
    });
  }

  async getUser(userId: number): Promise<MockUser | null> {
    return this.users.get(userId) || null;
  }

  async getClient(clientId: number): Promise<MockClient | null> {
    return this.clients.get(clientId) || null;
  }

  async getService(serviceId: number): Promise<MockService | null> {
    return this.services.get(serviceId) || null;
  }

  async createAppointment(userId: number, request: AppointmentRequest): Promise<{
    success: boolean;
    appointment?: MockAppointment;
    error?: string;
    message?: string;
    action?: string;
    redirectTo?: string;
  }> {
    // Check if user's phone is verified
    const user = await this.getUser(userId);
    if (!user || !user.phoneVerified) {
      return {
        success: false,
        error: 'Phone verification required',
        message: 'Please verify your phone number first. This keeps your appointments secure.',
        action: 'verify_phone',
        redirectTo: '/settings'
      };
    }

    // Validate client exists and belongs to user
    const client = await this.getClient(request.clientId);
    if (!client || client.userId !== userId) {
      return {
        success: false,
        error: 'Client not found',
        message: 'The specified client does not exist or does not belong to you.'
      };
    }

    // Validate services exist and belong to user
    if (!request.services || request.services.length === 0) {
      return {
        success: false,
        error: 'Services required',
        message: 'At least one service must be selected.'
      };
    }

    let totalDuration = 0;
    for (const serviceRequest of request.services) {
      const service = await this.getService(serviceRequest.serviceId);
      if (!service || service.userId !== userId) {
        return {
          success: false,
          error: 'Service not found',
          message: `Service ID ${serviceRequest.serviceId} not found or does not belong to you.`
        };
      }
      totalDuration += service.duration * serviceRequest.quantity;
    }

    // Create appointment
    const appointment: MockAppointment = {
      id: this.nextId++,
      userId,
      clientId: request.clientId,
      scheduledAt: new Date(request.scheduledAt),
      status: 'pending',
      duration: totalDuration,
      createdAt: new Date()
    };

    this.appointments.set(appointment.id, appointment);

    return {
      success: true,
      appointment
    };
  }

  // Test utilities
  verifyUserPhone(userId: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.phoneVerified = true;
    }
  }

  unverifyUserPhone(userId: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.phoneVerified = false;
    }
  }

  getUserCount(): number {
    return this.users.size;
  }

  getAppointmentCount(): number {
    return this.appointments.size;
  }

  clearAppointments(): void {
    this.appointments.clear();
    this.nextId = 1;
  }
}

// Mock API endpoint handler
class MockAppointmentAPI {
  private appointmentService: MockAppointmentCreationService;

  constructor() {
    this.appointmentService = new MockAppointmentCreationService();
  }

  async handlePostRequest(userId: number, data: AppointmentRequest): Promise<{
    status: number;
    data?: any;
    error?: string;
    message?: string;
    action?: string;
    redirectTo?: string;
  }> {
    try {
      const result = await this.appointmentService.createAppointment(userId, data);
      
      if (result.success) {
        return {
          status: 201,
          data: result.appointment
        };
      } else {
        return {
          status: 403,
          error: result.error,
          message: result.message,
          action: result.action,
          redirectTo: result.redirectTo
        };
      }
    } catch (error) {
      return {
        status: 500,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      };
    }
  }

  getAppointmentService(): MockAppointmentCreationService {
    return this.appointmentService;
  }
}

describe('Appointment Creation Phone Verification', () => {
  let appointmentAPI: MockAppointmentAPI;
  let appointmentService: MockAppointmentCreationService;

  beforeEach(() => {
    appointmentAPI = new MockAppointmentAPI();
    appointmentService = appointmentAPI.getAppointmentService();
  });

  describe('Phone Verification Check', () => {
    it('should allow appointment creation for verified users', async () => {
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ],
        message: 'Regular haircut appointment'
      };

      const result = await appointmentAPI.handlePostRequest(1, request);

      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.userId).toBe(1);
      expect(result.data.clientId).toBe(1);
      expect(result.data.status).toBe('pending');
    });

    it('should block appointment creation for unverified users', async () => {
      const request: AppointmentRequest = {
        clientId: 2,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 2, quantity: 1 }
        ],
        message: 'Beard trim appointment'
      };

      const result = await appointmentAPI.handlePostRequest(2, request);

      expect(result.status).toBe(403);
      expect(result.error).toBe('Phone verification required');
      expect(result.message).toBe('Please verify your phone number first. This keeps your appointments secure.');
      expect(result.action).toBe('verify_phone');
      expect(result.redirectTo).toBe('/settings');
    });

    it('should block appointment creation for users without phone', async () => {
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ]
      };

      const result = await appointmentAPI.handlePostRequest(3, request);

      expect(result.status).toBe(403);
      expect(result.error).toBe('Phone verification required');
      expect(result.message).toBe('Please verify your phone number first. This keeps your appointments secure.');
    });
  });

  describe('Phone Verification State Changes', () => {
    it('should allow appointments after phone verification', async () => {
      // Initially unverified user
      const user = await appointmentService.getUser(2);
      expect(user?.phoneVerified).toBe(false);

      // Try to create appointment - should fail
      const request: AppointmentRequest = {
        clientId: 2,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 2, quantity: 1 }
        ]
      };

      let result = await appointmentAPI.handlePostRequest(2, request);
      expect(result.status).toBe(403);
      expect(result.error).toBe('Phone verification required');

      // Verify phone
      appointmentService.verifyUserPhone(2);
      const verifiedUser = await appointmentService.getUser(2);
      expect(verifiedUser?.phoneVerified).toBe(true);

      // Try to create appointment again - should succeed
      result = await appointmentAPI.handlePostRequest(2, request);
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.userId).toBe(2);
    });

    it('should block appointments after phone unverification', async () => {
      // Initially verified user
      const user = await appointmentService.getUser(1);
      expect(user?.phoneVerified).toBe(true);

      // Try to create appointment - should succeed
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ]
      };

      let result = await appointmentAPI.handlePostRequest(1, request);
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();

      // Unverify phone
      appointmentService.unverifyUserPhone(1);
      const unverifiedUser = await appointmentService.getUser(1);
      expect(unverifiedUser?.phoneVerified).toBe(false);

      // Try to create appointment again - should fail
      result = await appointmentAPI.handlePostRequest(1, request);
      expect(result.status).toBe(403);
      expect(result.error).toBe('Phone verification required');
    });
  });

  describe('Database Schema Consistency', () => {
    it('should use phoneVerified (camelCase) field consistently', async () => {
      const user = await appointmentService.getUser(1);
      expect(user).toHaveProperty('phoneVerified');
      expect(typeof user?.phoneVerified).toBe('boolean');
      expect(user?.phoneVerified).toBe(true);
    });

    it('should check correct field name in verification logic', async () => {
      // Test with verified user
      const verifiedUser = await appointmentService.getUser(1);
      expect(verifiedUser?.phoneVerified).toBe(true);

      // Test with unverified user
      const unverifiedUser = await appointmentService.getUser(2);
      expect(unverifiedUser?.phoneVerified).toBe(false);

      // Verify the appointment creation uses the correct field
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ]
      };

      const verifiedResult = await appointmentAPI.handlePostRequest(1, request);
      expect(verifiedResult.status).toBe(201);

      const unverifiedResult = await appointmentAPI.handlePostRequest(2, request);
      expect(unverifiedResult.status).toBe(403);
    });
  });

  describe('Error Message Validation', () => {
    it('should return user-friendly error messages', async () => {
      const request: AppointmentRequest = {
        clientId: 2,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 2, quantity: 1 }
        ]
      };

      const result = await appointmentAPI.handlePostRequest(2, request);

      expect(result.status).toBe(403);
      expect(result.error).toBe('Phone verification required');
      expect(result.message).toBe('Please verify your phone number first. This keeps your appointments secure.');
      expect(result.action).toBe('verify_phone');
      expect(result.redirectTo).toBe('/settings');
    });

    it('should provide actionable guidance for phone verification', async () => {
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ]
      };

      const result = await appointmentAPI.handlePostRequest(3, request);

      expect(result.status).toBe(403);
      expect(result.message).toContain('Please verify your phone number first');
      expect(result.message).toContain('This keeps your appointments secure');
      expect(result.action).toBe('verify_phone');
      expect(result.redirectTo).toBe('/settings');
    });
  });

  describe('Appointment Validation', () => {
    it('should validate client ownership', async () => {
      const request: AppointmentRequest = {
        clientId: 999, // Non-existent client
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ]
      };

      const result = await appointmentAPI.handlePostRequest(1, request);

      expect(result.status).toBe(403);
      expect(result.error).toBe('Client not found');
      expect(result.message).toBe('The specified client does not exist or does not belong to you.');
    });

    it('should validate service requirements', async () => {
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [] // Empty services array
      };

      const result = await appointmentAPI.handlePostRequest(1, request);

      expect(result.status).toBe(403);
      expect(result.error).toBe('Services required');
      expect(result.message).toBe('At least one service must be selected.');
    });

    it('should validate service ownership', async () => {
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 2, quantity: 1 } // Service belongs to user 2, not user 1
        ]
      };

      const result = await appointmentAPI.handlePostRequest(1, request);

      expect(result.status).toBe(403);
      expect(result.error).toBe('Service not found');
      expect(result.message).toBe('Service ID 2 not found or does not belong to you.');
    });
  });

  describe('Integration Testing', () => {
    it('should handle complete appointment creation flow for verified user', async () => {
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T14:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ],
        message: 'Regular haircut',
        travelRequired: false
      };

      const result = await appointmentAPI.handlePostRequest(1, request);

      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.userId).toBe(1);
      expect(result.data.clientId).toBe(1);
      expect(result.data.status).toBe('pending');
      expect(result.data.duration).toBe(30); // Duration from service
      expect(result.data.scheduledAt).toEqual(new Date('2025-07-11T14:00:00.000Z'));
    });

    it('should handle multiple services in appointment creation', async () => {
      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T15:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 2 } // 2 haircuts = 60 minutes total
        ]
      };

      const result = await appointmentAPI.handlePostRequest(1, request);

      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.duration).toBe(60); // 30 * 2
    });

    it('should maintain appointment count accuracy', async () => {
      expect(appointmentService.getAppointmentCount()).toBe(0);

      const request: AppointmentRequest = {
        clientId: 1,
        scheduledAt: '2025-07-11T16:00:00.000Z',
        services: [
          { serviceId: 1, quantity: 1 }
        ]
      };

      await appointmentAPI.handlePostRequest(1, request);
      expect(appointmentService.getAppointmentCount()).toBe(1);

      await appointmentAPI.handlePostRequest(1, request);
      expect(appointmentService.getAppointmentCount()).toBe(2);
    });
  });
});