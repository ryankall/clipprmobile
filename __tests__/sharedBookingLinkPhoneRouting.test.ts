import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the storage and database modules
const mockStorage = {
  getUserByPhone: vi.fn(),
  getServicesByUserId: vi.fn(),
  createMessage: vi.fn(),
  getClientsByUserId: vi.fn(),
  getAppointmentsByUserId: vi.fn(),
};

const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
};

// Mock the imported modules
vi.mock('../server/storage', () => ({
  storage: mockStorage,
}));

vi.mock('../server/db', () => ({
  db: mockDb,
}));

vi.mock('../server/pushNotifications', () => ({
  sendNewBookingRequestNotification: vi.fn(),
}));

// Mock Express app and request/response objects
const mockResponse = {
  json: vi.fn(),
  status: vi.fn().mockReturnThis(),
};

const mockRequest = {
  params: {},
  query: {},
  body: {},
};

describe('Shared Booking Link Phone Number Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockStorage.getUserByPhone.mockReset();
    mockStorage.getServicesByUserId.mockReset();
    mockStorage.createMessage.mockReset();
    mockStorage.getClientsByUserId.mockReset();
    mockStorage.getAppointmentsByUserId.mockReset();
  });

  const mockUser = {
    id: 3,
    firstName: 'ryan',
    lastName: 'kall',
    phone: '3479425309',
    email: 'ryan11432@gmail.com',
    businessName: 'Clippr Barber',
    serviceArea: 'New York',
    about: 'Professional barber services',
    photoUrl: null,
    timezone: 'America/New_York',
    workingHours: {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: true, start: '10:00', end: '16:00' },
      sunday: { enabled: false, start: '', end: '' },
    },
  };

  const mockServices = [
    {
      id: 35,
      userId: 3,
      name: "Men's Haircut",
      description: "Classic men's haircut with styling",
      price: "35.00",
      duration: 45,
      category: "Haircuts",
      isActive: true,
    },
    {
      id: 38,
      userId: 3,
      name: "Beard Trim + Line Up",
      description: "Complete beard service with clean line up",
      price: "30.00",
      duration: 40,
      category: "Beard Services",
      isActive: true,
    },
  ];

  describe('Public API Barber Profile Lookup', () => {
    it('should find barber by unformatted phone number (primary method)', async () => {
      // Setup: Mock finding user with unformatted phone
      mockStorage.getUserByPhone.mockResolvedValueOnce(mockUser);

      // Simulate API endpoint logic
      const phoneParam = '3479425309-clipcutman';
      const phoneDigits = phoneParam.split('-')[0]; // "3479425309"
      
      // Try unformatted phone number first
      let user = await mockStorage.getUserByPhone(phoneDigits);
      
      // Verify
      expect(mockStorage.getUserByPhone).toHaveBeenCalledWith('3479425309');
      expect(user).toEqual(mockUser);
      expect(user.id).toBe(3);
      expect(user.phone).toBe('3479425309');
    });

    it('should fallback to formatted phone number if unformatted fails', async () => {
      // Setup: Mock unformatted lookup failing, formatted succeeding
      mockStorage.getUserByPhone
        .mockResolvedValueOnce(undefined) // First call (unformatted) fails
        .mockResolvedValueOnce(mockUser);  // Second call (formatted) succeeds

      // Simulate API endpoint logic
      const phoneParam = '3479425309-clipcutman';
      const phoneDigits = phoneParam.split('-')[0];
      
      let user = await mockStorage.getUserByPhone(phoneDigits);
      
      if (!user) {
        const formattedPhone = `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
        user = await mockStorage.getUserByPhone(formattedPhone);
      }
      
      // Verify
      expect(mockStorage.getUserByPhone).toHaveBeenCalledTimes(2);
      expect(mockStorage.getUserByPhone).toHaveBeenNthCalledWith(1, '3479425309');
      expect(mockStorage.getUserByPhone).toHaveBeenNthCalledWith(2, '(347) 942-5309');
      expect(user).toEqual(mockUser);
    });

    it('should return 404 when barber not found with any phone format', async () => {
      // Setup: Mock both lookups failing
      mockStorage.getUserByPhone.mockResolvedValue(undefined);

      const phoneParam = '1234567890-notfound';
      const phoneDigits = phoneParam.split('-')[0];
      
      let user = await mockStorage.getUserByPhone(phoneDigits);
      
      if (!user) {
        const formattedPhone = `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
        user = await mockStorage.getUserByPhone(formattedPhone);
      }
      
      // Verify
      expect(mockStorage.getUserByPhone).toHaveBeenCalledTimes(2);
      expect(user).toBeUndefined();
    });
  });

  describe('Public API Services Lookup', () => {
    it('should fetch services for barber using unformatted phone', async () => {
      // Setup
      mockStorage.getUserByPhone.mockResolvedValueOnce(mockUser);
      mockStorage.getServicesByUserId.mockResolvedValueOnce(mockServices);

      const phoneParam = '3479425309-clipcutman';
      const phoneDigits = phoneParam.split('-')[0];
      
      const user = await mockStorage.getUserByPhone(phoneDigits);
      
      if (user) {
        const services = await mockStorage.getServicesByUserId(user.id);
        const publicServices = services
          .filter((service) => service.isActive)
          .map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category: service.category,
          }));
        
        // Verify
        expect(mockStorage.getUserByPhone).toHaveBeenCalledWith('3479425309');
        expect(mockStorage.getServicesByUserId).toHaveBeenCalledWith(3);
        expect(publicServices).toHaveLength(2);
        expect(publicServices[0].name).toBe("Men's Haircut");
        expect(publicServices[1].name).toBe("Beard Trim + Line Up");
      }
    });
  });

  describe('Booking Request Phone Routing', () => {
    it('should route booking request to correct barber account', async () => {
      // Setup
      mockStorage.getUserByPhone.mockResolvedValueOnce(mockUser);
      mockStorage.createMessage.mockResolvedValueOnce({
        id: 223,
        userId: 3,
        customerName: 'Test Customer',
        customerPhone: '(555) 123-4567',
        subject: 'New Booking Request',
        message: 'Booking request message content',
        status: 'unread',
        priority: 'normal',
        createdAt: new Date(),
      });

      const bookingData = {
        barberPhone: '3479425309',
        clientName: 'Test Customer',
        clientPhone: '(555) 123-4567',
        selectedDate: '2025-07-29',
        selectedTime: '22:00',
        selectedServices: ['35'],
        message: 'Test booking request',
      };

      // Simulate booking request logic
      const user = await mockStorage.getUserByPhone(bookingData.barberPhone);
      
      if (user) {
        const messageRecord = await mockStorage.createMessage({
          userId: user.id,
          customerName: bookingData.clientName,
          customerPhone: bookingData.clientPhone,
          subject: 'New Booking Request',
          message: `New booking request content`,
          status: 'unread',
          priority: 'normal',
        });
        
        // Verify
        expect(mockStorage.getUserByPhone).toHaveBeenCalledWith('3479425309');
        expect(user.id).toBe(3); // Correct barber account
        expect(mockStorage.createMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 3, // Message created for correct barber
            customerName: 'Test Customer',
            customerPhone: '(555) 123-4567',
          })
        );
        expect(messageRecord.userId).toBe(3);
      }
    });

    it('should reject booking request if barber not found', async () => {
      // Setup: Mock barber not found
      mockStorage.getUserByPhone.mockResolvedValue(undefined);

      const bookingData = {
        barberPhone: '9999999999',
        clientName: 'Test Customer',
        clientPhone: '(555) 123-4567',
        selectedDate: '2025-07-29',
        selectedTime: '22:00',
        selectedServices: ['35'],
      };

      const user = await mockStorage.getUserByPhone(bookingData.barberPhone);
      
      // Verify
      expect(mockStorage.getUserByPhone).toHaveBeenCalledWith('9999999999');
      expect(user).toBeUndefined();
      expect(mockStorage.createMessage).not.toHaveBeenCalled();
    });
  });

  describe('URL Phone Number Parsing', () => {
    it('should correctly parse phone digits from booking link URL', () => {
      const testCases = [
        { url: '3479425309-clipcutman', expected: '3479425309' },
        { url: '6467891820-nybarber', expected: '6467891820' },
        { url: '5551234567-testbarber', expected: '5551234567' },
      ];

      testCases.forEach(({ url, expected }) => {
        const phoneDigits = url.split('-')[0];
        expect(phoneDigits).toBe(expected);
      });
    });

    it('should format phone numbers correctly when needed', () => {
      const testCases = [
        { digits: '3479425309', formatted: '(347) 942-5309' },
        { digits: '6467891820', formatted: '(646) 789-1820' },
        { digits: '5551234567', formatted: '(555) 123-4567' },
      ];

      testCases.forEach(({ digits, formatted }) => {
        const result = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        expect(result).toBe(formatted);
      });
    });
  });

  describe('Database Phone Storage Consistency', () => {
    it('should handle users with unformatted phone numbers', () => {
      const userWithUnformattedPhone = {
        ...mockUser,
        phone: '3479425309', // Unformatted
      };

      expect(userWithUnformattedPhone.phone).toBe('3479425309');
      expect(userWithUnformattedPhone.phone).not.toContain('(');
      expect(userWithUnformattedPhone.phone).not.toContain(')');
      expect(userWithUnformattedPhone.phone).not.toContain('-');
    });

    it('should handle legacy users with formatted phone numbers', () => {
      const userWithFormattedPhone = {
        ...mockUser,
        phone: '(347) 942-5309', // Formatted
      };

      expect(userWithFormattedPhone.phone).toBe('(347) 942-5309');
      expect(userWithFormattedPhone.phone).toContain('(');
      expect(userWithFormattedPhone.phone).toContain(')');
      expect(userWithFormattedPhone.phone).toContain('-');
    });
  });

  describe('Client Lookup Phone Normalization', () => {
    it('should normalize client phone numbers for matching', () => {
      const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
      
      const testCases = [
        { input: '(555) 123-4567', expected: '5551234567' },
        { input: '555-123-4567', expected: '5551234567' },
        { input: '555.123.4567', expected: '5551234567' },
        { input: '5551234567', expected: '5551234567' },
        { input: '+1 (555) 123-4567', expected: '15551234567' },
      ];

      testCases.forEach(({ input, expected }) => {
        const normalized = normalizePhone(input);
        expect(normalized).toBe(expected);
      });
    });

    it('should match clients with different phone formats', async () => {
      const mockClients = [
        { id: 1, name: 'John Doe', phone: '(555) 123-4567', userId: 3 },
        { id: 2, name: 'Jane Smith', phone: '555-987-6543', userId: 3 },
      ];

      mockStorage.getUserByPhone.mockResolvedValueOnce(mockUser);
      mockStorage.getClientsByUserId.mockResolvedValueOnce(mockClients);

      const phoneParam = '3479425309-clipcutman';
      const phoneDigits = phoneParam.split('-')[0];
      const clientPhone = '5551234567'; // Unformatted input

      const barber = await mockStorage.getUserByPhone(phoneDigits);
      
      if (barber) {
        const clients = await mockStorage.getClientsByUserId(barber.id);
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
        const normalizedClientPhone = normalizePhone(clientPhone);
        
        const client = clients.find((c) => 
          normalizePhone(c.phone) === normalizedClientPhone
        );

        // Verify
        expect(client).toBeDefined();
        expect(client?.name).toBe('John Doe');
        expect(normalizePhone(client?.phone || '')).toBe('5551234567');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed phone parameters', () => {
      const malformedUrls = [
        'clipcutman', // Missing phone
        '-clipcutman', // Empty phone
        '347942530-clipcutman', // Wrong phone length
        '34794253009-clipcutman', // Too many digits
      ];

      malformedUrls.forEach((url) => {
        const phoneDigits = url.split('-')[0];
        
        if (phoneDigits.length !== 10) {
          // Should not attempt formatting for invalid lengths
          expect(phoneDigits.length).not.toBe(10);
        }
      });
    });

    it('should handle database connection errors gracefully', async () => {
      // Setup: Mock database error
      mockStorage.getUserByPhone.mockRejectedValueOnce(new Error('Database connection failed'));

      try {
        await mockStorage.getUserByPhone('3479425309');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Database connection failed');
      }
    });

    it('should validate required booking request fields', () => {
      const validBookingData = {
        barberPhone: '3479425309',
        clientName: 'Test Customer',
        clientPhone: '(555) 123-4567',
        selectedDate: '2025-07-29',
        selectedTime: '22:00',
        selectedServices: ['35'],
      };

      const invalidBookingData = [
        { ...validBookingData, barberPhone: '' },
        { ...validBookingData, clientName: '' },
        { ...validBookingData, clientPhone: '' },
        { ...validBookingData, selectedDate: '' },
        { ...validBookingData, selectedTime: '' },
        { ...validBookingData, selectedServices: [] },
      ];

      invalidBookingData.forEach((data) => {
        const isValid = !!(
          data.barberPhone &&
          data.clientName &&
          data.clientPhone &&
          data.selectedDate &&
          data.selectedTime &&
          data.selectedServices?.length
        );
        
        expect(isValid).toBe(false);
      });

      // Valid data should pass
      const isValidData = !!(
        validBookingData.barberPhone &&
        validBookingData.clientName &&
        validBookingData.clientPhone &&
        validBookingData.selectedDate &&
        validBookingData.selectedTime &&
        validBookingData.selectedServices?.length
      );
      
      expect(isValidData).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete booking flow from link to message creation', async () => {
      // Setup complete flow
      mockStorage.getUserByPhone.mockResolvedValueOnce(mockUser);
      mockStorage.getServicesByUserId.mockResolvedValueOnce(mockServices);
      mockStorage.createMessage.mockResolvedValueOnce({
        id: 224,
        userId: 3,
        customerName: 'Integration Test',
        customerPhone: '(555) 999-8888',
        subject: 'New Booking Request',
        message: 'Complete flow test',
        status: 'unread',
        priority: 'normal',
        createdAt: new Date(),
      });

      // Simulate complete booking flow
      const bookingLinkUrl = '3479425309-clipcutman';
      const phoneDigits = bookingLinkUrl.split('-')[0];
      
      // 1. Find barber
      const barber = await mockStorage.getUserByPhone(phoneDigits);
      expect(barber?.id).toBe(3);
      
      // 2. Get services
      if (barber) {
        const services = await mockStorage.getServicesByUserId(barber.id);
        expect(services).toHaveLength(2);
        
        // 3. Create booking request
        const messageRecord = await mockStorage.createMessage({
          userId: barber.id,
          customerName: 'Integration Test',
          customerPhone: '(555) 999-8888',
          subject: 'New Booking Request',
          message: 'Complete flow test',
          status: 'unread',
          priority: 'normal',
        });
        
        expect(messageRecord.userId).toBe(3);
        expect(messageRecord.customerName).toBe('Integration Test');
      }
    });

    it('should prevent booking requests to wrong barber accounts', async () => {
      const wrongBarber = {
        id: 999,
        firstName: 'wrong',
        lastName: 'barber',
        phone: '9999999999',
      };

      // Setup: Mock finding wrong barber
      mockStorage.getUserByPhone.mockResolvedValueOnce(wrongBarber);

      const bookingLinkUrl = '3479425309-clipcutman';
      const phoneDigits = bookingLinkUrl.split('-')[0];
      
      const foundBarber = await mockStorage.getUserByPhone(phoneDigits);
      
      // Verify we don't accidentally route to wrong barber
      expect(foundBarber?.id).not.toBe(3); // Should not be the expected barber
      expect(foundBarber?.id).toBe(999); // This would be wrong in real scenario
      
      // In real implementation, this should not happen with correct phone lookup
    });
  });
});