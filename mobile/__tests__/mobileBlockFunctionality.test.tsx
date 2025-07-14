import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mobile blocking interfaces
interface MobileBlockedClient {
  id: number;
  barberId: string;
  phoneNumber: string;
  blockedAt: string;
  reason?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    screenSize: string;
  };
}

interface MobileBlockRequest {
  phoneNumber: string;
  reason?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    screenSize: string;
  };
}

interface MobileUnblockRequest {
  phoneNumber: string;
  confirmationCode?: string; // Mobile-specific confirmation
}

interface MobileBlockResponse {
  success: boolean;
  message: string;
  blockedClient?: MobileBlockedClient;
  pushNotificationSent?: boolean;
}

interface MobileUnblockResponse {
  success: boolean;
  message: string;
  pushNotificationSent?: boolean;
}

interface MobileMessage {
  id: number;
  barberId: string;
  customerName: string;
  customerPhone: string;
  message: string;
  createdAt: string;
  isBlocked?: boolean;
  source: 'mobile' | 'web' | 'sms';
  deviceInfo?: {
    userAgent: string;
    platform: string;
  };
}

// Mobile-specific blocking service with push notifications
class MobileBlockService {
  private blockedClients: Map<string, MobileBlockedClient[]> = new Map();
  private messages: MobileMessage[] = [];
  private nextId = 1;
  private pushNotificationService: MobilePushNotificationService;

  constructor() {
    this.pushNotificationService = new MobilePushNotificationService();
    this.setupMockData();
  }

  private setupMockData(): void {
    // Mock messages with mobile source tracking
    this.messages = [
      {
        id: 1,
        barberId: 'barber1',
        customerName: 'John Doe',
        customerPhone: '6467891234',
        message: 'Hi, I need a haircut appointment',
        createdAt: '2025-07-14T10:00:00Z',
        source: 'mobile',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          platform: 'iOS',
        },
      },
      {
        id: 2,
        barberId: 'barber1',
        customerName: 'Jane Smith',
        customerPhone: '6467895678',
        message: 'Can I book a beard trim?',
        createdAt: '2025-07-14T11:00:00Z',
        source: 'web',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Web',
        },
      },
    ];
  }

  async blockClient(barberId: string, request: MobileBlockRequest): Promise<MobileBlockResponse> {
    // Validate mobile phone number format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(request.phoneNumber)) {
      return {
        success: false,
        message: 'Invalid phone number format. Please enter a 10-digit number.',
        pushNotificationSent: false,
      };
    }

    // Check if client is already blocked
    const existingBlocks = this.blockedClients.get(barberId) || [];
    const isAlreadyBlocked = existingBlocks.some(
      block => block.phoneNumber === request.phoneNumber
    );

    if (isAlreadyBlocked) {
      return {
        success: false,
        message: 'This client is already blocked.',
        pushNotificationSent: false,
      };
    }

    // Create new block with mobile device info
    const newBlock: MobileBlockedClient = {
      id: this.nextId++,
      barberId,
      phoneNumber: request.phoneNumber,
      blockedAt: new Date().toISOString(),
      reason: request.reason,
      deviceInfo: request.deviceInfo,
    };

    // Add to blocked clients
    if (!this.blockedClients.has(barberId)) {
      this.blockedClients.set(barberId, []);
    }
    this.blockedClients.get(barberId)!.push(newBlock);

    // Send mobile push notification
    const pushNotificationSent = await this.pushNotificationService.sendBlockNotification(
      barberId,
      request.phoneNumber,
      request.reason
    );

    return {
      success: true,
      message: 'Client blocked successfully',
      blockedClient: newBlock,
      pushNotificationSent,
    };
  }

  async unblockClient(barberId: string, request: MobileUnblockRequest): Promise<MobileUnblockResponse> {
    const existingBlocks = this.blockedClients.get(barberId) || [];
    const blockIndex = existingBlocks.findIndex(
      block => block.phoneNumber === request.phoneNumber
    );

    if (blockIndex === -1) {
      return {
        success: false,
        message: 'Client is not currently blocked.',
        pushNotificationSent: false,
      };
    }

    // Remove from blocked clients
    existingBlocks.splice(blockIndex, 1);
    this.blockedClients.set(barberId, existingBlocks);

    // Send mobile push notification
    const pushNotificationSent = await this.pushNotificationService.sendUnblockNotification(
      barberId,
      request.phoneNumber
    );

    return {
      success: true,
      message: 'Client unblocked successfully',
      pushNotificationSent,
    };
  }

  async getBlockedClients(barberId: string): Promise<MobileBlockedClient[]> {
    return this.blockedClients.get(barberId) || [];
  }

  async isClientBlocked(barberId: string, phoneNumber: string): Promise<boolean> {
    const existingBlocks = this.blockedClients.get(barberId) || [];
    return existingBlocks.some(block => block.phoneNumber === phoneNumber);
  }

  getMobileMessagesForBarber(barberId: string): MobileMessage[] {
    return this.messages
      .filter(msg => msg.barberId === barberId)
      .map(msg => ({
        ...msg,
        isBlocked: this.isClientBlockedSync(barberId, msg.customerPhone),
      }));
  }

  private isClientBlockedSync(barberId: string, phoneNumber: string): boolean {
    const existingBlocks = this.blockedClients.get(barberId) || [];
    return existingBlocks.some(block => block.phoneNumber === phoneNumber);
  }

  // Mobile-specific methods
  async getBlockedClientsBySource(barberId: string, source: 'mobile' | 'web'): Promise<MobileBlockedClient[]> {
    const allBlocked = this.blockedClients.get(barberId) || [];
    return allBlocked.filter(block => 
      block.deviceInfo?.platform === (source === 'mobile' ? 'iOS' : 'Web') ||
      block.deviceInfo?.platform === (source === 'mobile' ? 'Android' : 'Web')
    );
  }

  async getMobileBlockingStats(barberId: string): Promise<{
    totalBlocked: number;
    mobileBlocked: number;
    webBlocked: number;
    blockedToday: number;
  }> {
    const allBlocked = this.blockedClients.get(barberId) || [];
    const today = new Date().toISOString().split('T')[0];
    
    return {
      totalBlocked: allBlocked.length,
      mobileBlocked: allBlocked.filter(block => 
        block.deviceInfo?.platform === 'iOS' || block.deviceInfo?.platform === 'Android'
      ).length,
      webBlocked: allBlocked.filter(block => 
        block.deviceInfo?.platform === 'Web'
      ).length,
      blockedToday: allBlocked.filter(block => 
        block.blockedAt.startsWith(today)
      ).length,
    };
  }

  clearBlockedClients(): void {
    this.blockedClients.clear();
  }
}

// Mobile push notification service for blocking
class MobilePushNotificationService {
  private notifications: any[] = [];

  async sendBlockNotification(barberId: string, phoneNumber: string, reason?: string): Promise<boolean> {
    try {
      const notification = {
        id: Date.now(),
        barberId,
        title: 'Client Blocked',
        body: `Client ${phoneNumber} has been blocked${reason ? ` - ${reason}` : ''}`,
        data: {
          action: 'client_blocked',
          phoneNumber,
          reason,
        },
        badge: 1,
        sound: 'default',
        category: 'client_management',
      };

      this.notifications.push(notification);
      return true;
    } catch (error) {
      console.error('Failed to send block notification:', error);
      return false;
    }
  }

  async sendUnblockNotification(barberId: string, phoneNumber: string): Promise<boolean> {
    try {
      const notification = {
        id: Date.now(),
        barberId,
        title: 'Client Unblocked',
        body: `Client ${phoneNumber} has been unblocked`,
        data: {
          action: 'client_unblocked',
          phoneNumber,
        },
        badge: 1,
        sound: 'default',
        category: 'client_management',
      };

      this.notifications.push(notification);
      return true;
    } catch (error) {
      console.error('Failed to send unblock notification:', error);
      return false;
    }
  }

  getNotifications(): any[] {
    return this.notifications;
  }

  clearNotifications(): void {
    this.notifications = [];
  }
}

// Mobile test wrapper
const MobileTestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Mobile Block Functionality', () => {
  let mobileBlockService: MobileBlockService;

  beforeEach(() => {
    mobileBlockService = new MobileBlockService();
  });

  describe('Mobile Client Blocking', () => {
    it('should block client with mobile device info', async () => {
      const request: MobileBlockRequest = {
        phoneNumber: '6467891234',
        reason: 'Inappropriate behavior',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          platform: 'iOS',
          screenSize: '375x667',
        },
      };

      const result = await mobileBlockService.blockClient('barber1', request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Client blocked successfully');
      expect(result.blockedClient?.phoneNumber).toBe('6467891234');
      expect(result.blockedClient?.deviceInfo?.platform).toBe('iOS');
      expect(result.pushNotificationSent).toBe(true);
    });

    it('should validate mobile phone number format', async () => {
      const request: MobileBlockRequest = {
        phoneNumber: '123', // Invalid format
        reason: 'Test',
      };

      const result = await mobileBlockService.blockClient('barber1', request);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid phone number format. Please enter a 10-digit number.');
      expect(result.pushNotificationSent).toBe(false);
    });

    it('should prevent duplicate blocking from mobile', async () => {
      const request: MobileBlockRequest = {
        phoneNumber: '6467891234',
        reason: 'First block',
      };

      // First block should succeed
      const firstResult = await mobileBlockService.blockClient('barber1', request);
      expect(firstResult.success).toBe(true);

      // Second block should fail
      const secondResult = await mobileBlockService.blockClient('barber1', request);
      expect(secondResult.success).toBe(false);
      expect(secondResult.message).toBe('This client is already blocked.');
    });
  });

  describe('Mobile Client Unblocking', () => {
    it('should unblock client with mobile confirmation', async () => {
      // First block a client
      const blockRequest: MobileBlockRequest = {
        phoneNumber: '6467891234',
        reason: 'Test block',
      };
      await mobileBlockService.blockClient('barber1', blockRequest);

      // Then unblock
      const unblockRequest: MobileUnblockRequest = {
        phoneNumber: '6467891234',
        confirmationCode: '123456',
      };

      const result = await mobileBlockService.unblockClient('barber1', unblockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Client unblocked successfully');
      expect(result.pushNotificationSent).toBe(true);
    });

    it('should handle unblocking non-blocked client', async () => {
      const request: MobileUnblockRequest = {
        phoneNumber: '6467891234',
      };

      const result = await mobileBlockService.unblockClient('barber1', request);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Client is not currently blocked.');
      expect(result.pushNotificationSent).toBe(false);
    });
  });

  describe('Mobile Push Notifications', () => {
    it('should send push notification when blocking client', async () => {
      const request: MobileBlockRequest = {
        phoneNumber: '6467891234',
        reason: 'Spam messages',
      };

      const result = await mobileBlockService.blockClient('barber1', request);

      expect(result.pushNotificationSent).toBe(true);
      
      // Check if notification was created
      const notifications = mobileBlockService['pushNotificationService'].getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Client Blocked');
      expect(notifications[0].body).toBe('Client 6467891234 has been blocked - Spam messages');
    });

    it('should send push notification when unblocking client', async () => {
      // First block a client
      await mobileBlockService.blockClient('barber1', {
        phoneNumber: '6467891234',
        reason: 'Test',
      });

      // Clear previous notifications
      mobileBlockService['pushNotificationService'].clearNotifications();

      // Then unblock
      const result = await mobileBlockService.unblockClient('barber1', {
        phoneNumber: '6467891234',
      });

      expect(result.pushNotificationSent).toBe(true);
      
      // Check if notification was created
      const notifications = mobileBlockService['pushNotificationService'].getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Client Unblocked');
      expect(notifications[0].body).toBe('Client 6467891234 has been unblocked');
    });
  });

  describe('Mobile Device Tracking', () => {
    it('should track mobile device info when blocking', async () => {
      const request: MobileBlockRequest = {
        phoneNumber: '6467891234',
        reason: 'Test',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          platform: 'iOS',
          screenSize: '390x844',
        },
      };

      await mobileBlockService.blockClient('barber1', request);

      const blockedClients = await mobileBlockService.getBlockedClients('barber1');
      expect(blockedClients).toHaveLength(1);
      expect(blockedClients[0].deviceInfo?.platform).toBe('iOS');
      expect(blockedClients[0].deviceInfo?.screenSize).toBe('390x844');
    });

    it('should filter blocked clients by mobile source', async () => {
      // Block from mobile
      await mobileBlockService.blockClient('barber1', {
        phoneNumber: '6467891234',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          platform: 'iOS',
          screenSize: '390x844',
        },
      });

      // Block from web
      await mobileBlockService.blockClient('barber1', {
        phoneNumber: '6467895678',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Web',
          screenSize: '1920x1080',
        },
      });

      const mobileBlocked = await mobileBlockService.getBlockedClientsBySource('barber1', 'mobile');
      const webBlocked = await mobileBlockService.getBlockedClientsBySource('barber1', 'web');

      expect(mobileBlocked).toHaveLength(1);
      expect(webBlocked).toHaveLength(1);
      expect(mobileBlocked[0].phoneNumber).toBe('6467891234');
      expect(webBlocked[0].phoneNumber).toBe('6467895678');
    });
  });

  describe('Mobile Blocking Statistics', () => {
    it('should provide mobile blocking statistics', async () => {
      // Block from mobile
      await mobileBlockService.blockClient('barber1', {
        phoneNumber: '6467891234',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          platform: 'iOS',
          screenSize: '390x844',
        },
      });

      // Block from Android
      await mobileBlockService.blockClient('barber1', {
        phoneNumber: '6467895678',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
          platform: 'Android',
          screenSize: '360x800',
        },
      });

      // Block from web
      await mobileBlockService.blockClient('barber1', {
        phoneNumber: '6467891111',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Web',
          screenSize: '1920x1080',
        },
      });

      const stats = await mobileBlockService.getMobileBlockingStats('barber1');

      expect(stats.totalBlocked).toBe(3);
      expect(stats.mobileBlocked).toBe(2); // iOS + Android
      expect(stats.webBlocked).toBe(1);
      expect(stats.blockedToday).toBe(3);
    });
  });

  describe('Mobile Performance Optimization', () => {
    it('should handle large mobile blocking datasets efficiently', async () => {
      // Create 1000 blocked clients
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(mobileBlockService.blockClient('barber1', {
          phoneNumber: `646789${i.toString().padStart(4, '0')}`,
          deviceInfo: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
            platform: 'iOS',
            screenSize: '390x844',
          },
        }));
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second

      const blockedClients = await mobileBlockService.getBlockedClients('barber1');
      expect(blockedClients).toHaveLength(1000);
    });

    it('should optimize mobile memory usage', async () => {
      // Test memory-efficient operations
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many blocking operations
      for (let i = 0; i < 100; i++) {
        await mobileBlockService.blockClient('barber1', {
          phoneNumber: `646789${i.toString().padStart(4, '0')}`,
        });
      }

      const afterBlockingMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterBlockingMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});