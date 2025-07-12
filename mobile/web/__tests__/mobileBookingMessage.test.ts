import { describe, it, expect, beforeEach } from 'vitest';

// Types for mobile booking system
interface MobileBookingRequest {
  barberId: string;
  phoneNumber: string;
  clientName: string;
  selectedDate: string;
  selectedTime: string;
  services: string[];
  message?: string;
  travelRequired?: boolean;
  address?: string;
}

interface MobileMessage {
  id: number;
  userId: number;
  customerName: string;
  customerPhone: string;
  message: string;
  services: string[];
  selectedDate: string;
  selectedTime: string;
  travelRequired: boolean;
  address?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

interface MobileBookingResponse {
  success: boolean;
  message: string;
  messageId?: number;
  estimatedDuration?: number;
}

// Mock mobile booking service
class MockMobileBookingService {
  private messages: MobileMessage[] = [];
  private nextId = 1;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // Add some test messages
    this.messages = [
      {
        id: 1,
        userId: 1,
        customerName: 'John Mobile',
        customerPhone: '(555) 123-4567',
        message: 'Looking for a fresh cut this weekend',
        services: ['Buzz Cut'],
        selectedDate: '2025-07-15',
        selectedTime: '2:00 PM',
        travelRequired: false,
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString()
      }
    ];
    this.nextId = 2;
  }

  async createBookingMessage(request: MobileBookingRequest): Promise<MobileBookingResponse> {
    // Validate required fields
    if (!request.clientName || !request.phoneNumber) {
      return {
        success: false,
        message: 'Client name and phone number are required'
      };
    }

    if (!request.selectedDate || !request.selectedTime) {
      return {
        success: false,
        message: 'Date and time selection are required'
      };
    }

    if (!request.services || request.services.length === 0) {
      return {
        success: false,
        message: 'At least one service must be selected'
      };
    }

    // Create mobile message
    const mobileMessage: MobileMessage = {
      id: this.nextId++,
      userId: parseInt(request.barberId),
      customerName: request.clientName,
      customerPhone: request.phoneNumber,
      message: request.message || `Mobile booking for ${request.services.join(', ')}`,
      services: request.services,
      selectedDate: request.selectedDate,
      selectedTime: request.selectedTime,
      travelRequired: request.travelRequired || false,
      address: request.address,
      isRead: false,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    this.messages.push(mobileMessage);

    // Calculate estimated duration based on services
    const estimatedDuration = this.calculateDuration(request.services);

    return {
      success: true,
      message: 'Mobile booking request sent successfully',
      messageId: mobileMessage.id,
      estimatedDuration
    };
  }

  private calculateDuration(services: string[]): number {
    const serviceDurations: Record<string, number> = {
      'Buzz Cut': 30,
      'Fade': 45,
      'Beard Trim': 20,
      'Full Service': 60,
      'Touch-up': 15
    };

    return services.reduce((total, service) => {
      return total + (serviceDurations[service] || 30);
    }, 0);
  }

  async getMessagesForBarber(barberId: string): Promise<MobileMessage[]> {
    return this.messages.filter(msg => msg.userId === parseInt(barberId));
  }

  async markMessageAsRead(messageId: number): Promise<boolean> {
    const message = this.messages.find(msg => msg.id === messageId);
    if (message) {
      message.isRead = true;
      return true;
    }
    return false;
  }

  async archiveMessage(messageId: number): Promise<boolean> {
    const message = this.messages.find(msg => msg.id === messageId);
    if (message) {
      message.isArchived = true;
      return true;
    }
    return false;
  }

  // Test helper methods
  getMessageCount(): number {
    return this.messages.length;
  }

  getUnreadCount(barberId: string): number {
    return this.messages.filter(msg => 
      msg.userId === parseInt(barberId) && !msg.isRead && !msg.isArchived
    ).length;
  }

  clearMessages(): void {
    this.messages = [];
    this.nextId = 1;
  }
}

describe('Mobile Booking Message System', () => {
  let mobileBookingService: MockMobileBookingService;

  beforeEach(() => {
    mobileBookingService = new MockMobileBookingService();
    mobileBookingService.clearMessages();
  });

  describe('Mobile Booking Request Creation', () => {
    it('should create a mobile booking message with required fields', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 987-6543',
        clientName: 'Mobile User',
        selectedDate: '2025-07-16',
        selectedTime: '3:00 PM',
        services: ['Fade']
      };

      const response = await mobileBookingService.createBookingMessage(request);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Mobile booking request sent successfully');
      expect(response.messageId).toBeDefined();
      expect(response.estimatedDuration).toBe(45);
    });

    it('should handle travel requests in mobile booking', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 111-2222',
        clientName: 'Travel Client',
        selectedDate: '2025-07-17',
        selectedTime: '4:00 PM',
        services: ['Full Service'],
        travelRequired: true,
        address: '123 Mobile St, App City, MC 12345'
      };

      const response = await mobileBookingService.createBookingMessage(request);

      expect(response.success).toBe(true);
      
      const messages = await mobileBookingService.getMessagesForBarber('1');
      const createdMessage = messages.find(msg => msg.id === response.messageId);
      
      expect(createdMessage?.travelRequired).toBe(true);
      expect(createdMessage?.address).toBe('123 Mobile St, App City, MC 12345');
    });

    it('should validate required fields for mobile booking', async () => {
      const incompleteRequest: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '',
        clientName: '',
        selectedDate: '2025-07-16',
        selectedTime: '3:00 PM',
        services: ['Fade']
      };

      const response = await mobileBookingService.createBookingMessage(incompleteRequest);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Client name and phone number are required');
    });

    it('should require date and time selection', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 999-8888',
        clientName: 'Date Missing',
        selectedDate: '',
        selectedTime: '',
        services: ['Buzz Cut']
      };

      const response = await mobileBookingService.createBookingMessage(request);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Date and time selection are required');
    });

    it('should require at least one service selection', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 777-6666',
        clientName: 'No Services',
        selectedDate: '2025-07-16',
        selectedTime: '3:00 PM',
        services: []
      };

      const response = await mobileBookingService.createBookingMessage(request);

      expect(response.success).toBe(false);
      expect(response.message).toBe('At least one service must be selected');
    });
  });

  describe('Mobile Message Management', () => {
    it('should track unread mobile messages', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 444-3333',
        clientName: 'Unread Test',
        selectedDate: '2025-07-16',
        selectedTime: '2:00 PM',
        services: ['Beard Trim']
      };

      await mobileBookingService.createBookingMessage(request);

      const unreadCount = mobileBookingService.getUnreadCount('1');
      expect(unreadCount).toBe(1);
    });

    it('should mark mobile messages as read', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 222-1111',
        clientName: 'Read Test',
        selectedDate: '2025-07-16',
        selectedTime: '1:00 PM',
        services: ['Touch-up']
      };

      const response = await mobileBookingService.createBookingMessage(request);
      
      const marked = await mobileBookingService.markMessageAsRead(response.messageId!);
      expect(marked).toBe(true);

      const unreadCount = mobileBookingService.getUnreadCount('1');
      expect(unreadCount).toBe(0);
    });

    it('should archive mobile messages', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 333-4444',
        clientName: 'Archive Test',
        selectedDate: '2025-07-16',
        selectedTime: '5:00 PM',
        services: ['Fade', 'Beard Trim']
      };

      const response = await mobileBookingService.createBookingMessage(request);
      
      const archived = await mobileBookingService.archiveMessage(response.messageId!);
      expect(archived).toBe(true);

      const messages = await mobileBookingService.getMessagesForBarber('1');
      const archivedMessage = messages.find(msg => msg.id === response.messageId);
      expect(archivedMessage?.isArchived).toBe(true);
    });
  });

  describe('Mobile Service Duration Calculation', () => {
    it('should calculate duration for single service', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 555-5555',
        clientName: 'Single Service',
        selectedDate: '2025-07-16',
        selectedTime: '3:00 PM',
        services: ['Buzz Cut']
      };

      const response = await mobileBookingService.createBookingMessage(request);

      expect(response.estimatedDuration).toBe(30);
    });

    it('should calculate duration for multiple services', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 666-7777',
        clientName: 'Multiple Services',
        selectedDate: '2025-07-16',
        selectedTime: '4:00 PM',
        services: ['Fade', 'Beard Trim', 'Touch-up']
      };

      const response = await mobileBookingService.createBookingMessage(request);

      // Fade: 45 + Beard Trim: 20 + Touch-up: 15 = 80 minutes
      expect(response.estimatedDuration).toBe(80);
    });

    it('should handle unknown services with default duration', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 888-9999',
        clientName: 'Unknown Service',
        selectedDate: '2025-07-16',
        selectedTime: '2:30 PM',
        services: ['Custom Style', 'Special Cut']
      };

      const response = await mobileBookingService.createBookingMessage(request);

      // Each unknown service defaults to 30 minutes: 30 + 30 = 60
      expect(response.estimatedDuration).toBe(60);
    });
  });

  describe('Mobile Message Retrieval', () => {
    it('should get messages for specific mobile barber', async () => {
      const request1: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 111-1111',
        clientName: 'Barber 1 Client',
        selectedDate: '2025-07-16',
        selectedTime: '10:00 AM',
        services: ['Buzz Cut']
      };

      const request2: MobileBookingRequest = {
        barberId: '2',
        phoneNumber: '(555) 222-2222',
        clientName: 'Barber 2 Client',
        selectedDate: '2025-07-16',
        selectedTime: '11:00 AM',
        services: ['Fade']
      };

      await mobileBookingService.createBookingMessage(request1);
      await mobileBookingService.createBookingMessage(request2);

      const barber1Messages = await mobileBookingService.getMessagesForBarber('1');
      const barber2Messages = await mobileBookingService.getMessagesForBarber('2');

      expect(barber1Messages.length).toBe(1);
      expect(barber2Messages.length).toBe(1);
      expect(barber1Messages[0].customerName).toBe('Barber 1 Client');
      expect(barber2Messages[0].customerName).toBe('Barber 2 Client');
    });

    it('should handle empty message list for mobile barber', async () => {
      const messages = await mobileBookingService.getMessagesForBarber('999');
      expect(messages.length).toBe(0);
    });
  });

  describe('Mobile Message Content', () => {
    it('should include custom message when provided', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 123-4567',
        clientName: 'Custom Message',
        selectedDate: '2025-07-16',
        selectedTime: '2:00 PM',
        services: ['Fade'],
        message: 'Please use mobile-friendly scheduling'
      };

      const response = await mobileBookingService.createBookingMessage(request);
      const messages = await mobileBookingService.getMessagesForBarber('1');
      const message = messages.find(msg => msg.id === response.messageId);

      expect(message?.message).toBe('Please use mobile-friendly scheduling');
    });

    it('should generate default message for mobile booking when none provided', async () => {
      const request: MobileBookingRequest = {
        barberId: '1',
        phoneNumber: '(555) 987-6543',
        clientName: 'Default Message',
        selectedDate: '2025-07-16',
        selectedTime: '3:00 PM',
        services: ['Buzz Cut', 'Beard Trim']
      };

      const response = await mobileBookingService.createBookingMessage(request);
      const messages = await mobileBookingService.getMessagesForBarber('1');
      const message = messages.find(msg => msg.id === response.messageId);

      expect(message?.message).toBe('Mobile booking for Buzz Cut, Beard Trim');
    });
  });
});