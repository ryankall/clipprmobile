import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for anti-spam protection
interface RateLimitEntry {
  phoneNumber: string;
  count: number;
  firstRequestAt: Date;
  lastRequestAt: Date;
  resetAt: Date;
}

interface BlockedClient {
  id: number;
  barberId: string;
  phoneNumber: string;
  blockedAt: Date;
  reason?: string;
}

interface BookingRequest {
  barberId: string;
  phoneNumber: string;
  clientName: string;
  selectedDate: string;
  selectedTime: string;
  services: string[];
  message?: string;
}

interface AntiSpamResult {
  allowed: boolean;
  error?: string;
  statusCode?: number;
  rateLimitInfo?: {
    remainingRequests: number;
    resetTime: Date;
  };
}

interface RateLimitStats {
  totalRequests: number;
  uniquePhoneNumbers: number;
  blockedRequests: number;
  rateLimitedRequests: number;
  topRequesters: Array<{
    phoneNumber: string;
    requestCount: number;
  }>;
}

// Mock anti-spam service
class MockAntiSpamService {
  private rateLimitData: Map<string, RateLimitEntry> = new Map();
  private blockedClients: Map<string, BlockedClient[]> = new Map();
  private requestLog: Array<{
    phoneNumber: string;
    barberId: string;
    timestamp: Date;
    allowed: boolean;
    reason?: string;
  }> = [];

  private readonly RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly MAX_REQUESTS_PER_WINDOW = 3;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // Add some test blocked clients
    this.blockedClients.set('barber123', [
      {
        id: 1,
        barberId: 'barber123',
        phoneNumber: '555-999-8888',
        blockedAt: new Date('2025-07-08T10:00:00Z'),
        reason: 'Spam requests',
      },
    ]);

    this.blockedClients.set('barber456', [
      {
        id: 2,
        barberId: 'barber456',
        phoneNumber: '555-777-6666',
        blockedAt: new Date('2025-07-08T15:00:00Z'),
        reason: 'Inappropriate behavior',
      },
    ]);
  }

  async checkRateLimit(phoneNumber: string): Promise<AntiSpamResult> {
    const now = new Date();
    const entry = this.rateLimitData.get(phoneNumber);

    if (!entry) {
      // First request from this phone number
      this.rateLimitData.set(phoneNumber, {
        phoneNumber,
        count: 1,
        firstRequestAt: now,
        lastRequestAt: now,
        resetAt: new Date(now.getTime() + this.RATE_LIMIT_WINDOW),
      });

      return {
        allowed: true,
        rateLimitInfo: {
          remainingRequests: this.MAX_REQUESTS_PER_WINDOW - 1,
          resetTime: new Date(now.getTime() + this.RATE_LIMIT_WINDOW),
        },
      };
    }

    // Check if rate limit window has expired
    if (now > entry.resetAt) {
      // Reset the counter
      this.rateLimitData.set(phoneNumber, {
        phoneNumber,
        count: 1,
        firstRequestAt: now,
        lastRequestAt: now,
        resetAt: new Date(now.getTime() + this.RATE_LIMIT_WINDOW),
      });

      return {
        allowed: true,
        rateLimitInfo: {
          remainingRequests: this.MAX_REQUESTS_PER_WINDOW - 1,
          resetTime: new Date(now.getTime() + this.RATE_LIMIT_WINDOW),
        },
      };
    }

    // Check if limit is exceeded
    if (entry.count >= this.MAX_REQUESTS_PER_WINDOW) {
      return {
        allowed: false,
        error: "You've reached your daily limit for booking requests. Please try again tomorrow.",
        statusCode: 429,
        rateLimitInfo: {
          remainingRequests: 0,
          resetTime: entry.resetAt,
        },
      };
    }

    // Increment counter
    entry.count++;
    entry.lastRequestAt = now;

    return {
      allowed: true,
      rateLimitInfo: {
        remainingRequests: this.MAX_REQUESTS_PER_WINDOW - entry.count,
        resetTime: entry.resetAt,
      },
    };
  }

  async checkBlockedClient(barberId: string, phoneNumber: string): Promise<AntiSpamResult> {
    const blockedList = this.blockedClients.get(barberId) || [];
    const blocked = blockedList.find(client => client.phoneNumber === phoneNumber);

    if (blocked) {
      return {
        allowed: false,
        error: "This barber is not accepting bookings from this number.",
        statusCode: 403,
      };
    }

    return { allowed: true };
  }

  async processBookingRequest(request: BookingRequest): Promise<AntiSpamResult> {
    // Check rate limit first
    const rateLimitResult = await this.checkRateLimit(request.phoneNumber);
    if (!rateLimitResult.allowed) {
      this.logRequest(request.phoneNumber, request.barberId, false, 'Rate limit exceeded');
      return rateLimitResult;
    }

    // Check if client is blocked by this barber
    const blockResult = await this.checkBlockedClient(request.barberId, request.phoneNumber);
    if (!blockResult.allowed) {
      this.logRequest(request.phoneNumber, request.barberId, false, 'Client blocked');
      return blockResult;
    }

    // Request is allowed
    this.logRequest(request.phoneNumber, request.barberId, true);
    return {
      allowed: true,
      rateLimitInfo: rateLimitResult.rateLimitInfo,
    };
  }

  async blockClient(barberId: string, phoneNumber: string, reason?: string): Promise<boolean> {
    const blockedList = this.blockedClients.get(barberId) || [];
    
    // Check if already blocked
    const existingBlock = blockedList.find(client => client.phoneNumber === phoneNumber);
    if (existingBlock) {
      return false; // Already blocked
    }

    const newBlock: BlockedClient = {
      id: Date.now(), // Simple ID generation for testing
      barberId,
      phoneNumber,
      blockedAt: new Date(),
      reason,
    };

    blockedList.push(newBlock);
    this.blockedClients.set(barberId, blockedList);
    return true;
  }

  async unblockClient(barberId: string, phoneNumber: string): Promise<boolean> {
    const blockedList = this.blockedClients.get(barberId) || [];
    const filteredList = blockedList.filter(client => client.phoneNumber !== phoneNumber);
    
    if (filteredList.length === blockedList.length) {
      return false; // Client was not blocked
    }

    this.blockedClients.set(barberId, filteredList);
    return true;
  }

  async getBlockedClients(barberId: string): Promise<BlockedClient[]> {
    return this.blockedClients.get(barberId) || [];
  }

  async isClientBlocked(barberId: string, phoneNumber: string): Promise<boolean> {
    const blockedList = this.blockedClients.get(barberId) || [];
    return blockedList.some(client => client.phoneNumber === phoneNumber);
  }

  private logRequest(phoneNumber: string, barberId: string, allowed: boolean, reason?: string): void {
    this.requestLog.push({
      phoneNumber,
      barberId,
      timestamp: new Date(),
      allowed,
      reason,
    });
  }

  async getRateLimitStats(): Promise<RateLimitStats> {
    const phoneNumbers = new Set(this.requestLog.map(log => log.phoneNumber));
    const blockedRequests = this.requestLog.filter(log => !log.allowed && log.reason === 'Client blocked').length;
    const rateLimitedRequests = this.requestLog.filter(log => !log.allowed && log.reason === 'Rate limit exceeded').length;

    // Count requests per phone number
    const phoneStats = new Map<string, number>();
    this.requestLog.forEach(log => {
      phoneStats.set(log.phoneNumber, (phoneStats.get(log.phoneNumber) || 0) + 1);
    });

    const topRequesters = Array.from(phoneStats.entries())
      .map(([phoneNumber, requestCount]) => ({ phoneNumber, requestCount }))
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 5);

    return {
      totalRequests: this.requestLog.length,
      uniquePhoneNumbers: phoneNumbers.size,
      blockedRequests,
      rateLimitedRequests,
      topRequesters,
    };
  }

  // Test helper methods
  simulateTimeAdvance(hours: number): void {
    const advanceMs = hours * 60 * 60 * 1000;
    const now = new Date();
    
    // Advance all rate limit entries
    this.rateLimitData.forEach((entry, phoneNumber) => {
      const newResetAt = new Date(entry.resetAt.getTime() - advanceMs);
      if (newResetAt <= now) {
        // Reset expired entries
        this.rateLimitData.delete(phoneNumber);
      }
    });
  }

  clearRateLimitData(): void {
    this.rateLimitData.clear();
  }

  clearBlockedClients(): void {
    this.blockedClients.clear();
  }

  clearRequestLog(): void {
    this.requestLog = [];
  }

  getRateLimitEntry(phoneNumber: string): RateLimitEntry | undefined {
    return this.rateLimitData.get(phoneNumber);
  }

  getRequestLog(): Array<{
    phoneNumber: string;
    barberId: string;
    timestamp: Date;
    allowed: boolean;
    reason?: string;
  }> {
    return [...this.requestLog];
  }
}

describe('Anti-Spam Protection Tests', () => {
  let antiSpamService: MockAntiSpamService;

  beforeEach(() => {
    antiSpamService = new MockAntiSpamService();
    antiSpamService.clearRateLimitData();
    antiSpamService.clearBlockedClients();
    antiSpamService.clearRequestLog();
  });

  describe('Rate Limiting Per Phone Number', () => {
    it('should allow first 3 booking requests per phone number', async () => {
      const phoneNumber = '555-123-4567';
      const barberId = 'barber123';

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const request: BookingRequest = {
          barberId,
          phoneNumber,
          clientName: `Test Client ${i + 1}`,
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        const result = await antiSpamService.processBookingRequest(request);
        expect(result.allowed).toBe(true);
        expect(result.rateLimitInfo?.remainingRequests).toBe(2 - i);
      }
    });

    it('should block 4th request within 24 hours', async () => {
      const phoneNumber = '555-123-4567';
      const barberId = 'barber123';

      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const request: BookingRequest = {
          barberId,
          phoneNumber,
          clientName: `Test Client ${i + 1}`,
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        await antiSpamService.processBookingRequest(request);
      }

      // 4th request should be blocked
      const fourthRequest: BookingRequest = {
        barberId,
        phoneNumber,
        clientName: 'Test Client 4',
        selectedDate: '2025-07-10',
        selectedTime: '11:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(fourthRequest);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.error).toBe("You've reached your daily limit for booking requests. Please try again tomorrow.");
    });

    it('should reset rate limit after 24 hours', async () => {
      const phoneNumber = '555-123-4567';
      const barberId = 'barber123';

      // Make 3 requests to reach limit
      for (let i = 0; i < 3; i++) {
        const request: BookingRequest = {
          barberId,
          phoneNumber,
          clientName: `Test Client ${i + 1}`,
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        await antiSpamService.processBookingRequest(request);
      }

      // Simulate 24 hours passing
      antiSpamService.simulateTimeAdvance(24);

      // New request should be allowed
      const newRequest: BookingRequest = {
        barberId,
        phoneNumber,
        clientName: 'Test Client New',
        selectedDate: '2025-07-11',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(newRequest);
      expect(result.allowed).toBe(true);
      expect(result.rateLimitInfo?.remainingRequests).toBe(2);
    });

    it('should handle different phone numbers independently', async () => {
      const phoneNumber1 = '555-111-1111';
      const phoneNumber2 = '555-222-2222';
      const barberId = 'barber123';

      // Make 3 requests from phone1
      for (let i = 0; i < 3; i++) {
        const request: BookingRequest = {
          barberId,
          phoneNumber: phoneNumber1,
          clientName: 'Client 1',
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        await antiSpamService.processBookingRequest(request);
      }

      // Phone2 should still be able to make requests
      const request2: BookingRequest = {
        barberId,
        phoneNumber: phoneNumber2,
        clientName: 'Client 2',
        selectedDate: '2025-07-10',
        selectedTime: '11:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(request2);
      expect(result.allowed).toBe(true);
      expect(result.rateLimitInfo?.remainingRequests).toBe(2);
    });

    it('should track rate limit info correctly', async () => {
      const phoneNumber = '555-123-4567';
      const barberId = 'barber123';

      const request: BookingRequest = {
        barberId,
        phoneNumber,
        clientName: 'Test Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(request);
      
      expect(result.rateLimitInfo?.remainingRequests).toBe(2);
      expect(result.rateLimitInfo?.resetTime).toBeInstanceOf(Date);
      expect(result.rateLimitInfo?.resetTime.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Barber-Controlled Block List', () => {
    it('should block booking requests from blocked phone numbers', async () => {
      const barberId = 'barber123';
      const phoneNumber = '555-987-6543';

      // Block the client
      await antiSpamService.blockClient(barberId, phoneNumber, 'Spam requests');

      // Try to make booking request
      const request: BookingRequest = {
        barberId,
        phoneNumber,
        clientName: 'Blocked Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toBe("This barber is not accepting bookings from this number.");
    });

    it('should allow booking after unblocking client', async () => {
      const barberId = 'barber123';
      const phoneNumber = '555-987-6543';

      // Block then unblock the client
      await antiSpamService.blockClient(barberId, phoneNumber, 'Test block');
      await antiSpamService.unblockClient(barberId, phoneNumber);

      // Try to make booking request
      const request: BookingRequest = {
        barberId,
        phoneNumber,
        clientName: 'Previously Blocked Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(request);
      expect(result.allowed).toBe(true);
    });

    it('should maintain separate block lists per barber (account isolation)', async () => {
      const barber1 = 'barber123';
      const barber2 = 'barber456';
      const phoneNumber = '555-shared-number';

      // Block client for barber1 only
      await antiSpamService.blockClient(barber1, phoneNumber, 'Blocked by barber1');

      // Request to barber1 should be blocked
      const request1: BookingRequest = {
        barberId: barber1,
        phoneNumber,
        clientName: 'Test Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result1 = await antiSpamService.processBookingRequest(request1);
      expect(result1.allowed).toBe(false);
      expect(result1.statusCode).toBe(403);

      // Request to barber2 should be allowed
      const request2: BookingRequest = {
        barberId: barber2,
        phoneNumber,
        clientName: 'Test Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result2 = await antiSpamService.processBookingRequest(request2);
      expect(result2.allowed).toBe(true);
    });

    it('should handle blocking the same client multiple times', async () => {
      const barberId = 'barber123';
      const phoneNumber = '555-duplicate-block';

      // Block the client twice
      const firstBlock = await antiSpamService.blockClient(barberId, phoneNumber, 'First block');
      const secondBlock = await antiSpamService.blockClient(barberId, phoneNumber, 'Second block');

      expect(firstBlock).toBe(true);
      expect(secondBlock).toBe(false); // Should return false for duplicate block

      // Client should still be blocked
      const isBlocked = await antiSpamService.isClientBlocked(barberId, phoneNumber);
      expect(isBlocked).toBe(true);
    });

    it('should handle unblocking non-blocked clients', async () => {
      const barberId = 'barber123';
      const phoneNumber = '555-not-blocked';

      // Try to unblock a client that wasn't blocked
      const result = await antiSpamService.unblockClient(barberId, phoneNumber);
      expect(result).toBe(false);
    });

    it('should retrieve blocked clients list per barber', async () => {
      const barberId = 'barber123';
      const phoneNumber1 = '555-blocked-1';
      const phoneNumber2 = '555-blocked-2';

      // Block two clients
      await antiSpamService.blockClient(barberId, phoneNumber1, 'Reason 1');
      await antiSpamService.blockClient(barberId, phoneNumber2, 'Reason 2');

      const blockedClients = await antiSpamService.getBlockedClients(barberId);
      expect(blockedClients).toHaveLength(2);
      expect(blockedClients.map(c => c.phoneNumber)).toContain(phoneNumber1);
      expect(blockedClients.map(c => c.phoneNumber)).toContain(phoneNumber2);
    });
  });

  describe('Combined Anti-Spam Protection', () => {
    it('should apply rate limiting before checking blocked clients', async () => {
      const barberId = 'barber123';
      const phoneNumber = '555-combined-test';

      // Make 3 requests to reach rate limit
      for (let i = 0; i < 3; i++) {
        const request: BookingRequest = {
          barberId,
          phoneNumber,
          clientName: `Client ${i + 1}`,
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        await antiSpamService.processBookingRequest(request);
      }

      // Now block the client
      await antiSpamService.blockClient(barberId, phoneNumber, 'Test block');

      // 4th request should be blocked by rate limit (429), not by block list (403)
      const fourthRequest: BookingRequest = {
        barberId,
        phoneNumber,
        clientName: 'Client 4',
        selectedDate: '2025-07-10',
        selectedTime: '11:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(fourthRequest);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429); // Rate limit takes precedence
    });

    it('should handle blocked client with available rate limit', async () => {
      const barberId = 'barber123';
      const phoneNumber = '555-blocked-with-limit';

      // Block the client first
      await antiSpamService.blockClient(barberId, phoneNumber, 'Blocked client');

      // Make request (should be blocked by block list, not rate limit)
      const request: BookingRequest = {
        barberId,
        phoneNumber,
        clientName: 'Blocked Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403); // Block list error
    });

    it('should maintain separate rate limits per barber link', async () => {
      const barber1 = 'barber123';
      const barber2 = 'barber456';
      const phoneNumber = '555-multi-barber';

      // Make 3 requests to barber1
      for (let i = 0; i < 3; i++) {
        const request: BookingRequest = {
          barberId: barber1,
          phoneNumber,
          clientName: 'Client',
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        await antiSpamService.processBookingRequest(request);
      }

      // Rate limit should be global per phone number, not per barber
      const requestToBarber2: BookingRequest = {
        barberId: barber2,
        phoneNumber,
        clientName: 'Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(requestToBarber2);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429); // Should be rate limited
    });
  });

  describe('Anti-Spam Statistics and Monitoring', () => {
    it('should track rate limit statistics correctly', async () => {
      const phoneNumber1 = '555-stats-1';
      const phoneNumber2 = '555-stats-2';
      const barberId = 'barber123';

      // Make requests from different numbers
      await antiSpamService.processBookingRequest({
        barberId,
        phoneNumber: phoneNumber1,
        clientName: 'Client 1',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      });

      await antiSpamService.processBookingRequest({
        barberId,
        phoneNumber: phoneNumber2,
        clientName: 'Client 2',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      });

      const stats = await antiSpamService.getRateLimitStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.uniquePhoneNumbers).toBe(2);
      expect(stats.rateLimitedRequests).toBe(0);
      expect(stats.blockedRequests).toBe(0);
    });

    it('should track blocked request statistics', async () => {
      const phoneNumber = '555-blocked-stats';
      const barberId = 'barber123';

      // Block client and make request
      await antiSpamService.blockClient(barberId, phoneNumber, 'Test block');
      await antiSpamService.processBookingRequest({
        barberId,
        phoneNumber,
        clientName: 'Blocked Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      });

      const stats = await antiSpamService.getRateLimitStats();
      expect(stats.blockedRequests).toBe(1);
      expect(stats.totalRequests).toBe(1);
    });

    it('should identify top requesters', async () => {
      const phoneNumber1 = '555-top-1';
      const phoneNumber2 = '555-top-2';
      const barberId = 'barber123';

      // Make multiple requests from phone1
      for (let i = 0; i < 3; i++) {
        await antiSpamService.processBookingRequest({
          barberId,
          phoneNumber: phoneNumber1,
          clientName: 'Heavy User',
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        });
      }

      // Make one request from phone2
      await antiSpamService.processBookingRequest({
        barberId,
        phoneNumber: phoneNumber2,
        clientName: 'Light User',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      });

      const stats = await antiSpamService.getRateLimitStats();
      expect(stats.topRequesters[0].phoneNumber).toBe(phoneNumber1);
      expect(stats.topRequesters[0].requestCount).toBe(3);
      expect(stats.topRequesters[1].phoneNumber).toBe(phoneNumber2);
      expect(stats.topRequesters[1].requestCount).toBe(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed phone numbers', async () => {
      const malformedNumbers = ['', '123', 'invalid', '+1-555-123-4567'];
      const barberId = 'barber123';

      for (const phoneNumber of malformedNumbers) {
        const request: BookingRequest = {
          barberId,
          phoneNumber,
          clientName: 'Test Client',
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        // Should still process the request (validation should be handled elsewhere)
        const result = await antiSpamService.processBookingRequest(request);
        expect(result.allowed).toBe(true);
      }
    });

    it('should handle concurrent requests from same phone number', async () => {
      const phoneNumber = '555-concurrent';
      const barberId = 'barber123';

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => ({
        barberId,
        phoneNumber,
        clientName: `Client ${i + 1}`,
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      }));

      const results = await Promise.all(
        requests.map(request => antiSpamService.processBookingRequest(request))
      );

      // Should allow first 3, block remaining 2
      const allowedCount = results.filter(r => r.allowed).length;
      const blockedCount = results.filter(r => !r.allowed).length;

      expect(allowedCount).toBe(3);
      expect(blockedCount).toBe(2);
    });

    it('should handle very long phone numbers', async () => {
      const longPhoneNumber = '555-' + '1'.repeat(50);
      const barberId = 'barber123';

      const request: BookingRequest = {
        barberId,
        phoneNumber: longPhoneNumber,
        clientName: 'Test Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      };

      const result = await antiSpamService.processBookingRequest(request);
      expect(result.allowed).toBe(true);
    });

    it('should handle empty or null barber IDs', async () => {
      const phoneNumber = '555-no-barber';
      const invalidBarberIds = ['', null, undefined];

      for (const barberId of invalidBarberIds) {
        const request: BookingRequest = {
          barberId: barberId as string,
          phoneNumber,
          clientName: 'Test Client',
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        };

        // Should still process (validation should be handled elsewhere)
        const result = await antiSpamService.processBookingRequest(request);
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('Account Isolation Validation', () => {
    it('should ensure rate limits are global across all barbers', async () => {
      const phoneNumber = '555-global-limit';
      const barber1 = 'barber123';
      const barber2 = 'barber456';

      // Make 2 requests to barber1
      for (let i = 0; i < 2; i++) {
        await antiSpamService.processBookingRequest({
          barberId: barber1,
          phoneNumber,
          clientName: 'Client',
          selectedDate: '2025-07-10',
          selectedTime: '10:00',
          services: ['Haircut'],
        });
      }

      // Make 1 request to barber2
      await antiSpamService.processBookingRequest({
        barberId: barber2,
        phoneNumber,
        clientName: 'Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      });

      // Next request to any barber should be blocked
      const result = await antiSpamService.processBookingRequest({
        barberId: barber1,
        phoneNumber,
        clientName: 'Client',
        selectedDate: '2025-07-10',
        selectedTime: '10:00',
        services: ['Haircut'],
      });

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(429);
    });

    it('should ensure blocked clients are isolated per barber', async () => {
      const phoneNumber = '555-isolated-block';
      const barber1 = 'barber123';
      const barber2 = 'barber456';

      // Block client for barber1
      await antiSpamService.blockClient(barber1, phoneNumber);

      // Verify block lists are separate
      const barber1Blocked = await antiSpamService.getBlockedClients(barber1);
      const barber2Blocked = await antiSpamService.getBlockedClients(barber2);

      expect(barber1Blocked.some(c => c.phoneNumber === phoneNumber)).toBe(true);
      expect(barber2Blocked.some(c => c.phoneNumber === phoneNumber)).toBe(false);
    });

    it('should prevent cross-barber block manipulation', async () => {
      const phoneNumber = '555-cross-barber';
      const barber1 = 'barber123';
      const barber2 = 'barber456';

      // Block client for barber1
      await antiSpamService.blockClient(barber1, phoneNumber);

      // Try to unblock from barber2 (should fail)
      const unblockResult = await antiSpamService.unblockClient(barber2, phoneNumber);
      expect(unblockResult).toBe(false);

      // Client should still be blocked for barber1
      const isStillBlocked = await antiSpamService.isClientBlocked(barber1, phoneNumber);
      expect(isStillBlocked).toBe(true);
    });
  });
});