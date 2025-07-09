import { describe, it, expect, beforeEach } from 'vitest';

interface BlockedClient {
  id: number;
  barberId: string;
  phoneNumber: string;
  blockedAt: Date;
  reason?: string;
}

interface BlockRequest {
  phoneNumber: string;
  reason?: string;
}

interface UnblockRequest {
  phoneNumber: string;
}

interface BlockResponse {
  success: boolean;
  message: string;
  blockedClient?: BlockedClient;
}

interface UnblockResponse {
  success: boolean;
  message: string;
}

interface Message {
  id: number;
  barberId: string;
  customerName: string;
  customerPhone: string;
  message: string;
  createdAt: Date;
  isBlocked?: boolean;
}

class MockBlockService {
  private blockedClients: Map<string, BlockedClient[]> = new Map();
  private messages: Message[] = [];
  private nextId = 1;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // Mock messages from different phone numbers
    this.messages = [
      {
        id: 1,
        barberId: 'barber1',
        customerName: 'John Doe',
        customerPhone: '6467891234',
        message: 'Hi, I need a haircut appointment',
        createdAt: new Date('2025-07-09T10:00:00Z')
      },
      {
        id: 2,
        barberId: 'barber1',
        customerName: 'Jane Smith',
        customerPhone: '6467895678',
        message: 'Can I book a beard trim?',
        createdAt: new Date('2025-07-09T11:00:00Z')
      },
      {
        id: 3,
        barberId: 'barber2',
        customerName: 'Bob Wilson',
        customerPhone: '6467891234', // Same phone as John Doe
        message: 'Looking for a haircut',
        createdAt: new Date('2025-07-09T12:00:00Z')
      }
    ];
  }

  async blockClient(barberId: string, request: BlockRequest): Promise<BlockResponse> {
    const { phoneNumber, reason } = request;

    // Validate phone number format
    if (!phoneNumber || !phoneNumber.match(/^\d{10}$/)) {
      return {
        success: false,
        message: 'Invalid phone number format'
      };
    }

    // Check if already blocked
    const barberBlockedClients = this.blockedClients.get(barberId) || [];
    if (barberBlockedClients.some(client => client.phoneNumber === phoneNumber)) {
      return {
        success: false,
        message: 'Client is already blocked'
      };
    }

    // Create blocked client entry
    const blockedClient: BlockedClient = {
      id: this.nextId++,
      barberId,
      phoneNumber,
      blockedAt: new Date(),
      reason
    };

    // Add to blocked clients
    if (!this.blockedClients.has(barberId)) {
      this.blockedClients.set(barberId, []);
    }
    this.blockedClients.get(barberId)!.push(blockedClient);

    return {
      success: true,
      message: 'Client blocked successfully',
      blockedClient
    };
  }

  async unblockClient(barberId: string, request: UnblockRequest): Promise<UnblockResponse> {
    const { phoneNumber } = request;

    const barberBlockedClients = this.blockedClients.get(barberId) || [];
    const clientIndex = barberBlockedClients.findIndex(client => client.phoneNumber === phoneNumber);

    if (clientIndex === -1) {
      return {
        success: false,
        message: 'Client is not blocked'
      };
    }

    // Remove from blocked clients
    barberBlockedClients.splice(clientIndex, 1);

    return {
      success: true,
      message: 'Client unblocked successfully'
    };
  }

  async getBlockedClients(barberId: string): Promise<BlockedClient[]> {
    return this.blockedClients.get(barberId) || [];
  }

  async isClientBlocked(barberId: string, phoneNumber: string): Promise<boolean> {
    const barberBlockedClients = this.blockedClients.get(barberId) || [];
    return barberBlockedClients.some(client => client.phoneNumber === phoneNumber);
  }

  getMessagesForBarber(barberId: string): Message[] {
    return this.messages
      .filter(msg => msg.barberId === barberId)
      .map(msg => ({
        ...msg,
        isBlocked: this.isClientBlockedSync(barberId, msg.customerPhone)
      }));
  }

  private isClientBlockedSync(barberId: string, phoneNumber: string): boolean {
    const barberBlockedClients = this.blockedClients.get(barberId) || [];
    return barberBlockedClients.some(client => client.phoneNumber === phoneNumber);
  }

  // Test utilities
  clearBlockedClients(): void {
    this.blockedClients.clear();
  }

  getBlockedClientsCount(barberId: string): number {
    return this.blockedClients.get(barberId)?.length || 0;
  }

  getAllBlockedClients(): Map<string, BlockedClient[]> {
    return new Map(this.blockedClients);
  }
}

describe('Block Functionality', () => {
  let blockService: MockBlockService;
  const barberId1 = 'barber1';
  const barberId2 = 'barber2';

  beforeEach(() => {
    blockService = new MockBlockService();
  });

  describe('Block Client', () => {
    it('should successfully block a client', async () => {
      const request: BlockRequest = {
        phoneNumber: '6467891234',
        reason: 'Inappropriate behavior'
      };

      const response = await blockService.blockClient(barberId1, request);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Client blocked successfully');
      expect(response.blockedClient).toBeDefined();
      expect(response.blockedClient!.phoneNumber).toBe('6467891234');
      expect(response.blockedClient!.reason).toBe('Inappropriate behavior');
    });

    it('should block a client without reason', async () => {
      const request: BlockRequest = {
        phoneNumber: '6467891234'
      };

      const response = await blockService.blockClient(barberId1, request);

      expect(response.success).toBe(true);
      expect(response.blockedClient!.reason).toBeUndefined();
    });

    it('should reject invalid phone number format', async () => {
      const request: BlockRequest = {
        phoneNumber: 'invalid-phone'
      };

      const response = await blockService.blockClient(barberId1, request);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Invalid phone number format');
    });

    it('should reject empty phone number', async () => {
      const request: BlockRequest = {
        phoneNumber: ''
      };

      const response = await blockService.blockClient(barberId1, request);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Invalid phone number format');
    });

    it('should prevent duplicate blocking', async () => {
      const request: BlockRequest = {
        phoneNumber: '6467891234'
      };

      // Block first time
      await blockService.blockClient(barberId1, request);

      // Try to block again
      const response = await blockService.blockClient(barberId1, request);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Client is already blocked');
    });

    it('should maintain separate blocked lists for different barbers', async () => {
      const request: BlockRequest = {
        phoneNumber: '6467891234'
      };

      // Block for barber1
      await blockService.blockClient(barberId1, request);

      // Block same phone for barber2 (should succeed)
      const response = await blockService.blockClient(barberId2, request);

      expect(response.success).toBe(true);
      expect(await blockService.getBlockedClientsCount(barberId1)).toBe(1);
      expect(await blockService.getBlockedClientsCount(barberId2)).toBe(1);
    });
  });

  describe('Unblock Client', () => {
    beforeEach(async () => {
      // Setup blocked clients
      await blockService.blockClient(barberId1, { phoneNumber: '6467891234' });
      await blockService.blockClient(barberId1, { phoneNumber: '6467895678' });
    });

    it('should successfully unblock a client', async () => {
      const request: UnblockRequest = {
        phoneNumber: '6467891234'
      };

      const response = await blockService.unblockClient(barberId1, request);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Client unblocked successfully');
      expect(await blockService.isClientBlocked(barberId1, '6467891234')).toBe(false);
    });

    it('should reject unblocking non-blocked client', async () => {
      const request: UnblockRequest = {
        phoneNumber: '6467999999'
      };

      const response = await blockService.unblockClient(barberId1, request);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Client is not blocked');
    });

    it('should maintain account isolation during unblocking', async () => {
      const phoneNumber = '6467891234';
      
      // Block for both barbers
      await blockService.blockClient(barberId1, { phoneNumber });
      await blockService.blockClient(barberId2, { phoneNumber });

      // Unblock for barber1 only
      await blockService.unblockClient(barberId1, { phoneNumber });

      expect(await blockService.isClientBlocked(barberId1, phoneNumber)).toBe(false);
      expect(await blockService.isClientBlocked(barberId2, phoneNumber)).toBe(true);
    });
  });

  describe('Get Blocked Clients', () => {
    it('should return empty list for barber with no blocked clients', async () => {
      const blockedClients = await blockService.getBlockedClients(barberId1);
      expect(blockedClients).toEqual([]);
    });

    it('should return blocked clients for specific barber', async () => {
      await blockService.blockClient(barberId1, { phoneNumber: '6467891234', reason: 'Spam' });
      await blockService.blockClient(barberId1, { phoneNumber: '6467895678', reason: 'Rude' });

      const blockedClients = await blockService.getBlockedClients(barberId1);

      expect(blockedClients).toHaveLength(2);
      expect(blockedClients[0].phoneNumber).toBe('6467891234');
      expect(blockedClients[0].reason).toBe('Spam');
      expect(blockedClients[1].phoneNumber).toBe('6467895678');
      expect(blockedClients[1].reason).toBe('Rude');
    });

    it('should maintain separate lists for different barbers', async () => {
      await blockService.blockClient(barberId1, { phoneNumber: '6467891234' });
      await blockService.blockClient(barberId2, { phoneNumber: '6467895678' });

      const blocked1 = await blockService.getBlockedClients(barberId1);
      const blocked2 = await blockService.getBlockedClients(barberId2);

      expect(blocked1).toHaveLength(1);
      expect(blocked2).toHaveLength(1);
      expect(blocked1[0].phoneNumber).toBe('6467891234');
      expect(blocked2[0].phoneNumber).toBe('6467895678');
    });
  });

  describe('Check Blocked Status', () => {
    beforeEach(async () => {
      await blockService.blockClient(barberId1, { phoneNumber: '6467891234' });
    });

    it('should return true for blocked client', async () => {
      const isBlocked = await blockService.isClientBlocked(barberId1, '6467891234');
      expect(isBlocked).toBe(true);
    });

    it('should return false for non-blocked client', async () => {
      const isBlocked = await blockService.isClientBlocked(barberId1, '6467895678');
      expect(isBlocked).toBe(false);
    });

    it('should respect barber isolation', async () => {
      const isBlocked1 = await blockService.isClientBlocked(barberId1, '6467891234');
      const isBlocked2 = await blockService.isClientBlocked(barberId2, '6467891234');

      expect(isBlocked1).toBe(true);
      expect(isBlocked2).toBe(false);
    });
  });

  describe('Message Integration', () => {
    it('should mark messages as blocked when client is blocked', async () => {
      // Initially, no messages are blocked
      let messages = blockService.getMessagesForBarber(barberId1);
      expect(messages.every(msg => !msg.isBlocked)).toBe(true);

      // Block a client
      await blockService.blockClient(barberId1, { phoneNumber: '6467891234' });

      // Check messages again
      messages = blockService.getMessagesForBarber(barberId1);
      const blockedMessage = messages.find(msg => msg.customerPhone === '6467891234');
      const unblockedMessage = messages.find(msg => msg.customerPhone === '6467895678');

      expect(blockedMessage?.isBlocked).toBe(true);
      expect(unblockedMessage?.isBlocked).toBe(false);
    });

    it('should respect barber isolation in message blocking', async () => {
      await blockService.blockClient(barberId1, { phoneNumber: '6467891234' });

      const messages1 = blockService.getMessagesForBarber(barberId1);
      const messages2 = blockService.getMessagesForBarber(barberId2);

      const blockedMsg1 = messages1.find(msg => msg.customerPhone === '6467891234');
      const blockedMsg2 = messages2.find(msg => msg.customerPhone === '6467891234');

      expect(blockedMsg1?.isBlocked).toBe(true);
      expect(blockedMsg2?.isBlocked).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle blocking multiple clients simultaneously', async () => {
      const phoneNumbers = ['6467891234', '6467895678', '6467999999'];
      
      const blockPromises = phoneNumbers.map(phone => 
        blockService.blockClient(barberId1, { phoneNumber: phone })
      );
      
      const responses = await Promise.all(blockPromises);
      
      expect(responses.every(r => r.success)).toBe(true);
      expect(await blockService.getBlockedClientsCount(barberId1)).toBe(3);
    });

    it('should handle unblocking all clients', async () => {
      const phoneNumbers = ['6467891234', '6467895678', '6467999999'];
      
      // Block all clients
      for (const phone of phoneNumbers) {
        await blockService.blockClient(barberId1, { phoneNumber: phone });
      }

      // Unblock all clients
      for (const phone of phoneNumbers) {
        await blockService.unblockClient(barberId1, { phoneNumber: phone });
      }

      expect(await blockService.getBlockedClientsCount(barberId1)).toBe(0);
    });

    it('should handle very long reason text', async () => {
      const longReason = 'A'.repeat(1000);
      
      const response = await blockService.blockClient(barberId1, {
        phoneNumber: '6467891234',
        reason: longReason
      });

      expect(response.success).toBe(true);
      expect(response.blockedClient!.reason).toBe(longReason);
    });

    it('should handle special characters in reason', async () => {
      const specialReason = 'Client used inappropriate language: "!@#$%^&*()_+{}[]|\\:";\'<>?,./';
      
      const response = await blockService.blockClient(barberId1, {
        phoneNumber: '6467891234',
        reason: specialReason
      });

      expect(response.success).toBe(true);
      expect(response.blockedClient!.reason).toBe(specialReason);
    });

    it('should maintain blocked client data integrity', async () => {
      const blockTime = new Date();
      
      const response = await blockService.blockClient(barberId1, {
        phoneNumber: '6467891234',
        reason: 'Test reason'
      });

      expect(response.blockedClient!.id).toBeGreaterThan(0);
      expect(response.blockedClient!.barberId).toBe(barberId1);
      expect(response.blockedClient!.phoneNumber).toBe('6467891234');
      expect(response.blockedClient!.reason).toBe('Test reason');
      expect(response.blockedClient!.blockedAt).toBeInstanceOf(Date);
      expect(response.blockedClient!.blockedAt.getTime()).toBeGreaterThanOrEqual(blockTime.getTime());
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of blocked clients efficiently', async () => {
      const startTime = Date.now();
      
      // Block 100 clients
      for (let i = 0; i < 100; i++) {
        await blockService.blockClient(barberId1, {
          phoneNumber: `646789${i.toString().padStart(4, '0')}`
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(await blockService.getBlockedClientsCount(barberId1)).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should efficiently check blocked status for many clients', async () => {
      // Block some clients
      const blockedPhones = ['6467891234', '6467895678', '6467999999'];
      for (const phone of blockedPhones) {
        await blockService.blockClient(barberId1, { phoneNumber: phone });
      }

      const startTime = Date.now();
      
      // Check 1000 phone numbers
      const checkPromises = [];
      for (let i = 0; i < 1000; i++) {
        checkPromises.push(
          blockService.isClientBlocked(barberId1, `646789${i.toString().padStart(4, '0')}`)
        );
      }
      
      const results = await Promise.all(checkPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});