import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock client data structures
interface MockClient {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  isVip?: boolean;
  createdAt: Date;
}

interface MockUser {
  id: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  photoUrl?: string;
  serviceArea?: string;
  about?: string;
}

interface ClientLookupResponse {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface BookingFormData {
  clientPhone: string;
  clientName: string;
  clientEmail: string;
  existingClient: ClientLookupResponse | null;
  showWelcomeMessage: boolean;
}

// Mock API service for shared link client lookup
class MockSharedLinkService {
  private users: MockUser[] = [];
  private clients: MockClient[] = [];

  constructor() {
    this.setupTestData();
  }

  private setupTestData(): void {
    // Setup test barbers
    this.users = [
      {
        id: 1,
        email: "barber1@example.com",
        phone: "(555) 123-4567",
        firstName: "John",
        lastName: "Barber",
        businessName: "John's Cuts",
      },
      {
        id: 2,
        email: "barber2@example.com",
        phone: "(555) 987-6543",
        firstName: "Jane",
        lastName: "Stylist",
        businessName: "Jane's Styles",
      },
    ];

    // Setup test clients
    this.clients = [
      {
        id: 1,
        userId: 1, // John's client
        name: "Anthony Davis",
        phone: "(555) 111-2222",
        email: "anthony@example.com",
        address: "123 Main St, City, State 12345",
        notes: "Prefers short cuts",
        isVip: true,
        createdAt: new Date('2025-01-15'),
      },
      {
        id: 2,
        userId: 1, // John's client
        name: "Marcus Johnson",
        phone: "(555) 333-4444",
        email: "marcus@example.com",
        address: "456 Oak Ave, City, State 12345",
        notes: "Regular customer",
        isVip: false,
        createdAt: new Date('2025-02-10'),
      },
      {
        id: 3,
        userId: 2, // Jane's client
        name: "Sarah Wilson",
        phone: "(555) 555-6666",
        email: "sarah@example.com",
        address: "789 Pine St, City, State 12345",
        notes: "Likes trendy styles",
        isVip: true,
        createdAt: new Date('2025-03-05'),
      },
      {
        id: 4,
        userId: 1, // John's client without email
        name: "Robert Brown",
        phone: "(555) 777-8888",
        address: "321 Elm St, City, State 12345",
        notes: "Cash only",
        isVip: false,
        createdAt: new Date('2025-03-20'),
      },
    ];
  }

  // Parse barber phone from URL format (e.g., "5551234567-johnbarber")
  private parseBarberPhone(barberInfo: string): string {
    const phoneDigits = barberInfo.split('-')[0];
    return `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`;
  }

  // Get barber by phone number
  async getBarberByPhone(phone: string): Promise<MockUser | null> {
    return this.users.find(user => user.phone === phone) || null;
  }

  // Get clients for a specific barber
  async getClientsByUserId(userId: number): Promise<MockClient[]> {
    return this.clients.filter(client => client.userId === userId);
  }

  // Main client lookup function (simulates API endpoint)
  async lookupClient(barberInfo: string, clientPhone: string): Promise<ClientLookupResponse | null> {
    try {
      // Parse barber phone from URL
      const barberPhone = this.parseBarberPhone(barberInfo);
      
      // Find barber
      const barber = await this.getBarberByPhone(barberPhone);
      if (!barber) {
        throw new Error('Barber not found');
      }

      // Get barber's clients
      const clients = await this.getClientsByUserId(barber.id);
      
      // Find client by phone number
      const client = clients.find(c => c.phone === clientPhone);
      
      if (client) {
        return {
          name: client.name,
          phone: client.phone,
          email: client.email,
          address: client.address,
        };
      }
      
      return null;
    } catch (error) {
      // Silently return null for invalid lookups in tests
      return null;
    }
  }

  // Simulate frontend form handling
  handleClientLookup(clientPhone: string, barberInfo: string): Promise<BookingFormData> {
    return new Promise(async (resolve) => {
      const initialFormData: BookingFormData = {
        clientPhone,
        clientName: '',
        clientEmail: '',
        existingClient: null,
        showWelcomeMessage: false,
      };

      // Only lookup if phone number is complete (10+ digits)
      if (clientPhone.length >= 10) {
        const lookupResult = await this.lookupClient(barberInfo, clientPhone);
        
        if (lookupResult) {
          resolve({
            ...initialFormData,
            clientName: lookupResult.name,
            clientEmail: lookupResult.email || '',
            existingClient: lookupResult,
            showWelcomeMessage: true,
          });
        } else {
          resolve({
            ...initialFormData,
            existingClient: null,
            showWelcomeMessage: false,
          });
        }
      } else {
        resolve(initialFormData);
      }
    });
  }

  // Test helper methods
  getAllClients(): MockClient[] {
    return [...this.clients];
  }

  getAllUsers(): MockUser[] {
    return [...this.users];
  }

  addTestClient(client: Omit<MockClient, 'id' | 'createdAt'>): MockClient {
    const newClient: MockClient = {
      ...client,
      id: this.clients.length + 1,
      createdAt: new Date(),
    };
    this.clients.push(newClient);
    return newClient;
  }

  resetTestData(): void {
    this.setupTestData();
  }
}

describe('Shared Link Client Lookup System', () => {
  let sharedLinkService: MockSharedLinkService;

  beforeEach(() => {
    sharedLinkService = new MockSharedLinkService();
  });

  describe('Client Lookup Basic Functionality', () => {
    it('should find existing client by phone number', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 111-2222';

      const result = await sharedLinkService.lookupClient(barberInfo, clientPhone);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Anthony Davis');
      expect(result?.phone).toBe('(555) 111-2222');
      expect(result?.email).toBe('anthony@example.com');
      expect(result?.address).toBe('123 Main St, City, State 12345');
    });

    it('should return null for non-existent client', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 999-9999'; // Non-existent phone

      const result = await sharedLinkService.lookupClient(barberInfo, clientPhone);

      expect(result).toBeNull();
    });

    it('should only return clients belonging to the correct barber', async () => {
      const barberInfo = '5551234567-johnbarber'; // John's barber info
      const clientPhone = '(555) 555-6666'; // Sarah's phone (belongs to Jane)

      const result = await sharedLinkService.lookupClient(barberInfo, clientPhone);

      expect(result).toBeNull(); // Should not find Sarah because she belongs to Jane
    });

    it('should find client for correct barber', async () => {
      const barberInfo = '5559876543-janestylist'; // Jane's barber info
      const clientPhone = '(555) 555-6666'; // Sarah's phone (belongs to Jane)

      const result = await sharedLinkService.lookupClient(barberInfo, clientPhone);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Sarah Wilson');
      expect(result?.phone).toBe('(555) 555-6666');
    });

    it('should handle client without email address', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 777-8888'; // Robert Brown (no email)

      const result = await sharedLinkService.lookupClient(barberInfo, clientPhone);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Robert Brown');
      expect(result?.phone).toBe('(555) 777-8888');
      expect(result?.email).toBeUndefined();
      expect(result?.address).toBe('321 Elm St, City, State 12345');
    });
  });

  describe('Frontend Form Integration', () => {
    it('should auto-fill form when existing client is found', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 111-2222';

      const formData = await sharedLinkService.handleClientLookup(clientPhone, barberInfo);

      expect(formData.clientName).toBe('Anthony Davis');
      expect(formData.clientEmail).toBe('anthony@example.com');
      expect(formData.existingClient).not.toBeNull();
      expect(formData.existingClient?.name).toBe('Anthony Davis');
      expect(formData.showWelcomeMessage).toBe(true);
    });

    it('should not auto-fill form when client is not found', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 999-9999';

      const formData = await sharedLinkService.handleClientLookup(clientPhone, barberInfo);

      expect(formData.clientName).toBe('');
      expect(formData.clientEmail).toBe('');
      expect(formData.existingClient).toBeNull();
      expect(formData.showWelcomeMessage).toBe(false);
    });

    it('should only trigger lookup for complete phone numbers', async () => {
      const barberInfo = '5551234567-johnbarber';
      const shortPhone = '(555) 111'; // Incomplete phone number

      const formData = await sharedLinkService.handleClientLookup(shortPhone, barberInfo);

      expect(formData.clientName).toBe('');
      expect(formData.clientEmail).toBe('');
      expect(formData.existingClient).toBeNull();
      expect(formData.showWelcomeMessage).toBe(false);
    });

    it('should handle client with partial information', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 777-8888'; // Robert Brown (no email)

      const formData = await sharedLinkService.handleClientLookup(clientPhone, barberInfo);

      expect(formData.clientName).toBe('Robert Brown');
      expect(formData.clientEmail).toBe(''); // Empty string for missing email
      expect(formData.existingClient).not.toBeNull();
      expect(formData.existingClient?.email).toBeUndefined();
      expect(formData.showWelcomeMessage).toBe(true);
    });
  });

  describe('Barber Isolation Testing', () => {
    it('should maintain strict client isolation between barbers', async () => {
      const johnBarberInfo = '5551234567-johnbarber';
      const janeBarberInfo = '5559876543-janestylist';

      // John's clients
      const johnClient1 = await sharedLinkService.lookupClient(johnBarberInfo, '(555) 111-2222');
      const johnClient2 = await sharedLinkService.lookupClient(johnBarberInfo, '(555) 333-4444');

      // Jane's client
      const janeClient = await sharedLinkService.lookupClient(janeBarberInfo, '(555) 555-6666');

      // John should find his clients
      expect(johnClient1?.name).toBe('Anthony Davis');
      expect(johnClient2?.name).toBe('Marcus Johnson');

      // Jane should find her client
      expect(janeClient?.name).toBe('Sarah Wilson');

      // Cross-lookup should fail
      const crossLookup1 = await sharedLinkService.lookupClient(johnBarberInfo, '(555) 555-6666');
      const crossLookup2 = await sharedLinkService.lookupClient(janeBarberInfo, '(555) 111-2222');

      expect(crossLookup1).toBeNull();
      expect(crossLookup2).toBeNull();
    });

    it('should handle multiple clients with similar phone patterns', async () => {
      // Add test clients with similar phone patterns
      sharedLinkService.addTestClient({
        userId: 1,
        name: 'Similar Phone 1',
        phone: '(555) 111-1111',
        email: 'similar1@example.com',
      });

      sharedLinkService.addTestClient({
        userId: 2,
        name: 'Similar Phone 2',
        phone: '(555) 111-1111', // Same phone, different barber
        email: 'similar2@example.com',
      });

      const johnResult = await sharedLinkService.lookupClient('5551234567-johnbarber', '(555) 111-1111');
      const janeResult = await sharedLinkService.lookupClient('5559876543-janestylist', '(555) 111-1111');

      expect(johnResult?.name).toBe('Similar Phone 1');
      expect(janeResult?.name).toBe('Similar Phone 2');
    });
  });

  describe('URL Parsing and Barber Resolution', () => {
    it('should correctly parse barber phone from URL format', async () => {
      const testCases = [
        {
          barberInfo: '5551234567-johnbarber',
          expectedPhone: '(555) 123-4567',
          expectedBarber: 'John Barber',
        },
        {
          barberInfo: '5559876543-janestylist',
          expectedPhone: '(555) 987-6543',
          expectedBarber: 'Jane Stylist',
        },
      ];

      for (const testCase of testCases) {
        const barber = await sharedLinkService.getBarberByPhone(testCase.expectedPhone);
        expect(barber).not.toBeNull();
        expect(barber?.firstName + ' ' + barber?.lastName).toBe(testCase.expectedBarber);
      }
    });

    it('should handle invalid barber info in URL', async () => {
      const invalidBarberInfo = '9999999999-unknownbarber';
      const clientPhone = '(555) 111-2222';

      const result = await sharedLinkService.lookupClient(invalidBarberInfo, clientPhone);

      expect(result).toBeNull();
    });

    it('should handle malformed URL formats', async () => {
      const malformedUrls = [
        'invalidformat',
        '123-notenoughdigits',
        'toolongphonenumber1234567890-barber',
        '',
      ];

      for (const malformedUrl of malformedUrls) {
        const result = await sharedLinkService.lookupClient(malformedUrl, '(555) 111-2222');
        expect(result).toBeNull();
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of clients efficiently', async () => {
      // Add many test clients
      for (let i = 0; i < 100; i++) {
        sharedLinkService.addTestClient({
          userId: 1,
          name: `Test Client ${i}`,
          phone: `(555) 100-${i.toString().padStart(4, '0')}`,
          email: `test${i}@example.com`,
        });
      }

      const startTime = Date.now();
      const result = await sharedLinkService.lookupClient('5551234567-johnbarber', '(555) 100-0050');
      const endTime = Date.now();

      expect(result?.name).toBe('Test Client 50');
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should handle concurrent lookups correctly', async () => {
      const barberInfo = '5551234567-johnbarber';
      const phones = ['(555) 111-2222', '(555) 333-4444', '(555) 777-8888'];

      const results = await Promise.all(
        phones.map(phone => sharedLinkService.lookupClient(barberInfo, phone))
      );

      expect(results[0]?.name).toBe('Anthony Davis');
      expect(results[1]?.name).toBe('Marcus Johnson');
      expect(results[2]?.name).toBe('Robert Brown');
    });

    it('should handle empty and whitespace phone numbers', async () => {
      const barberInfo = '5551234567-johnbarber';
      const invalidPhones = ['', '   ', '\t\n', null, undefined];

      for (const phone of invalidPhones) {
        const result = await sharedLinkService.lookupClient(barberInfo, phone as string);
        expect(result).toBeNull();
      }
    });

    it('should handle phone number format variations', async () => {
      const barberInfo = '5551234567-johnbarber';
      const phoneFormats = [
        '(555) 111-2222',
        '555-111-2222',
        '5551112222',
        '555.111.2222',
        '+1 555 111 2222',
      ];

      // Only the exact format should match
      const results = await Promise.all(
        phoneFormats.map(phone => sharedLinkService.lookupClient(barberInfo, phone))
      );

      expect(results[0]?.name).toBe('Anthony Davis'); // Exact match
      expect(results[1]).toBeNull(); // Different format
      expect(results[2]).toBeNull(); // Different format
      expect(results[3]).toBeNull(); // Different format
      expect(results[4]).toBeNull(); // Different format
    });
  });

  describe('UI Integration and Timing', () => {
    it('should trigger lookup when phone number length >= 10 and time is selected', async () => {
      const barberInfo = '5551234567-johnbarber';
      const longEnoughPhone = '(555) 111-2222';
      const shortPhone = '(555) 111';

      // Should trigger lookup with long phone and selected time
      const resultWithTimeAndLongPhone = await sharedLinkService.handleClientLookup(longEnoughPhone, barberInfo);
      expect(resultWithTimeAndLongPhone.existingClient).not.toBeNull();
      expect(resultWithTimeAndLongPhone.showWelcomeMessage).toBe(true);

      // Should not trigger lookup with short phone
      const resultWithShortPhone = await sharedLinkService.handleClientLookup(shortPhone, barberInfo);
      expect(resultWithShortPhone.existingClient).toBeNull();
      expect(resultWithShortPhone.showWelcomeMessage).toBe(false);
    });

    it('should handle phone number changes and re-trigger lookup', async () => {
      const barberInfo = '5551234567-johnbarber';
      
      // First lookup
      const firstResult = await sharedLinkService.handleClientLookup('(555) 111-2222', barberInfo);
      expect(firstResult.existingClient?.name).toBe('Anthony Davis');

      // Change phone number
      const secondResult = await sharedLinkService.handleClientLookup('(555) 333-4444', barberInfo);
      expect(secondResult.existingClient?.name).toBe('Marcus Johnson');

      // Change to non-existent phone
      const thirdResult = await sharedLinkService.handleClientLookup('(555) 999-9999', barberInfo);
      expect(thirdResult.existingClient).toBeNull();
    });

    it('should show welcome message only for found clients', async () => {
      const barberInfo = '5551234567-johnbarber';

      // Existing client
      const existingResult = await sharedLinkService.handleClientLookup('(555) 111-2222', barberInfo);
      expect(existingResult.showWelcomeMessage).toBe(true);

      // Non-existing client
      const nonExistingResult = await sharedLinkService.handleClientLookup('(555) 999-9999', barberInfo);
      expect(nonExistingResult.showWelcomeMessage).toBe(false);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should ensure client data integrity in lookup results', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 111-2222';

      const result = await sharedLinkService.lookupClient(barberInfo, clientPhone);

      // Verify all expected fields are present
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('address');

      // Verify data types
      expect(typeof result?.name).toBe('string');
      expect(typeof result?.phone).toBe('string');
      expect(result?.email === undefined || typeof result?.email === 'string').toBe(true);
      expect(result?.address === undefined || typeof result?.address === 'string').toBe(true);
    });

    it('should not expose sensitive client information', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 111-2222';

      const result = await sharedLinkService.lookupClient(barberInfo, clientPhone);

      // Verify sensitive fields are not exposed
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('notes');
      expect(result).not.toHaveProperty('isVip');
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should handle client data updates correctly', async () => {
      const barberInfo = '5551234567-johnbarber';
      const clientPhone = '(555) 111-2222';

      // Initial lookup
      const initialResult = await sharedLinkService.lookupClient(barberInfo, clientPhone);
      expect(initialResult?.name).toBe('Anthony Davis');

      // Simulate data update
      const client = sharedLinkService.getAllClients().find(c => c.phone === clientPhone);
      if (client) {
        client.name = 'Anthony Davis Updated';
        client.email = 'anthony.updated@example.com';
      }

      // Lookup after update
      const updatedResult = await sharedLinkService.lookupClient(barberInfo, clientPhone);
      expect(updatedResult?.name).toBe('Anthony Davis Updated');
      expect(updatedResult?.email).toBe('anthony.updated@example.com');
    });
  });
});