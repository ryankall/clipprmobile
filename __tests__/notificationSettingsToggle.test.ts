import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock API request and localStorage
const mockApiRequest = vi.fn();
const mockLocalStorage = {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock service worker and push manager
const mockPushManager = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getSubscription: vi.fn(),
};

const mockServiceWorker = {
  ready: Promise.resolve({
    pushManager: mockPushManager,
  }),
};

// Mock notification permission
const mockNotification = {
  permission: 'default',
  requestPermission: vi.fn(),
};

// Mock push notification subscription
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationSettings {
  pushNotifications: boolean;
  soundEffects: boolean;
  subscribed: boolean;
  subscription?: PushSubscription;
}

interface NotificationToggleResult {
  success: boolean;
  message: string;
  error?: string;
  subscribed: boolean;
}

interface ToastMessage {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

// Mock notification settings service
class MockNotificationSettingsService {
  private settings: NotificationSettings = {
    pushNotifications: false,
    soundEffects: true,
    subscribed: false,
  };

  private subscriptions: Map<string, PushSubscription> = new Map();
  private toastMessages: ToastMessage[] = [];

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // Mock valid push subscription
    const validSubscription: PushSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    };

    // Setup mock subscription for user
    this.subscriptions.set('user-123', validSubscription);
  }

  async enablePushNotifications(userId: string): Promise<NotificationToggleResult> {
    try {
      // Simulate permission request
      if (mockNotification.permission === 'denied') {
        return {
          success: false,
          message: 'Permission denied',
          error: 'User denied notification permission',
          subscribed: false,
        };
      }

      // Simulate service worker registration
      try {
        await mockServiceWorker.ready;
      } catch (error) {
        return {
          success: false,
          message: 'Service worker not available',
          error: 'Service worker not supported',
          subscribed: false,
        };
      }

      // Get push subscription
      const subscription = this.subscriptions.get(userId);
      if (!subscription) {
        return {
          success: false,
          message: 'Failed to create subscription',
          error: 'Push subscription failed',
          subscribed: false,
        };
      }

      // Save subscription via API
      const response = await mockApiRequest('POST', '/api/push/subscribe', {
        subscription,
      });

      if (response.success) {
        this.settings.pushNotifications = true;
        this.settings.subscribed = true;
        this.settings.subscription = subscription;
        
        this.addToast({
          title: 'Push Notifications Enabled',
          description: "You'll now receive notifications for new bookings and appointments.",
        });

        return {
          success: true,
          message: 'Push notifications enabled successfully',
          subscribed: true,
        };
      } else {
        return {
          success: false,
          message: 'Failed to enable push notifications',
          error: response.error || 'API request failed',
          subscribed: false,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error enabling push notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
        subscribed: false,
      };
    }
  }

  async disablePushNotifications(userId: string): Promise<NotificationToggleResult> {
    try {
      // Unsubscribe via API
      const response = await mockApiRequest('POST', '/api/push/unsubscribe');

      if (response.success) {
        this.settings.pushNotifications = false;
        this.settings.subscribed = false;
        this.settings.subscription = undefined;
        
        this.addToast({
          title: 'Push Notifications Disabled',
          description: "You'll no longer receive push notifications.",
        });

        return {
          success: true,
          message: 'Push notifications disabled successfully',
          subscribed: false,
        };
      } else {
        return {
          success: false,
          message: 'Failed to disable push notifications',
          error: response.error || 'API request failed',
          subscribed: true,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error disabling push notifications',
        error: error instanceof Error ? error.message : 'Unknown error',
        subscribed: true,
      };
    }
  }

  toggleSoundEffects(enabled: boolean): { success: boolean; message: string } {
    this.settings.soundEffects = enabled;
    mockLocalStorage.setItem('soundEffects', enabled.toString());
    
    this.addToast({
      title: enabled ? 'Sound Effects Enabled' : 'Sound Effects Disabled',
      description: enabled ? 'App sounds are now on' : 'App sounds are now off',
    });

    return {
      success: true,
      message: `Sound effects ${enabled ? 'enabled' : 'disabled'} successfully`,
    };
  }

  async sendTestNotification(userId: string): Promise<{ success: boolean; message: string; error?: string }> {
    if (!this.settings.subscribed) {
      return {
        success: false,
        message: 'Not subscribed to push notifications',
        error: 'User not subscribed',
      };
    }

    try {
      const response = await mockApiRequest('POST', '/api/push/test');

      if (response.success) {
        this.addToast({
          title: 'Test Notification Sent',
          description: 'Check your device for the test notification.',
        });

        return {
          success: true,
          message: 'Test notification sent successfully',
        };
      } else {
        return {
          success: false,
          message: 'Failed to send test notification',
          error: response.error || 'API request failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error sending test notification',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  getSubscriptionStatus(userId: string): { subscribed: boolean; subscription?: PushSubscription } {
    return {
      subscribed: this.settings.subscribed,
      subscription: this.settings.subscription,
    };
  }

  async checkPermission(): Promise<'granted' | 'denied' | 'default'> {
    return mockNotification.permission as 'granted' | 'denied' | 'default';
  }

  private addToast(message: ToastMessage): void {
    this.toastMessages.push(message);
  }

  getToastMessages(): ToastMessage[] {
    return [...this.toastMessages];
  }

  clearToastMessages(): void {
    this.toastMessages = [];
  }

  // Test utility methods
  setPermission(permission: 'granted' | 'denied' | 'default'): void {
    mockNotification.permission = permission;
  }

  simulateServiceWorkerError(): void {
    (mockServiceWorker as any).ready = Promise.reject(new Error('Service worker failed'));
  }

  simulateApiError(endpoint: string, error: string): void {
    mockApiRequest.mockImplementation((method: string, url: string) => {
      if (url === endpoint) {
        throw new Error(error);
      }
      return Promise.resolve({ success: true });
    });
  }

  resetMocks(): void {
    this.settings = {
      pushNotifications: false,
      soundEffects: true,
      subscribed: false,
    };
    this.toastMessages = [];
    mockNotification.permission = 'default';
    (mockServiceWorker as any).ready = Promise.resolve({
      pushManager: mockPushManager,
    });
    mockApiRequest.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.getItem.mockClear();
  }
}

// Test suite
describe('Notification Settings Toggle', () => {
  let notificationService: MockNotificationSettingsService;
  const testUserId = 'user-123';

  beforeEach(() => {
    notificationService = new MockNotificationSettingsService();
    
    // Setup successful API responses by default
    mockApiRequest.mockImplementation((method: string, url: string, data?: any) => {
      if (url === '/api/push/subscribe') {
        return Promise.resolve({ success: true, message: 'Subscribed successfully' });
      }
      if (url === '/api/push/unsubscribe') {
        return Promise.resolve({ success: true, message: 'Unsubscribed successfully' });
      }
      if (url === '/api/push/test') {
        return Promise.resolve({ success: true, message: 'Test notification sent' });
      }
      return Promise.resolve({ success: true });
    });

    // Setup permission as granted by default
    mockNotification.permission = 'granted';
  });

  afterEach(() => {
    notificationService.resetMocks();
  });

  describe('Push Notifications ON State', () => {
    it('should successfully enable push notifications when permission is granted', async () => {
      // Arrange
      mockNotification.permission = 'granted';
      
      // Act
      const result = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.subscribed).toBe(true);
      expect(result.message).toBe('Push notifications enabled successfully');
      
      const settings = notificationService.getSettings();
      expect(settings.pushNotifications).toBe(true);
      expect(settings.subscribed).toBe(true);
      expect(settings.subscription).toBeDefined();
    });

    it('should show success toast when push notifications are enabled', async () => {
      // Act
      await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      const toasts = notificationService.getToastMessages();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].title).toBe('Push Notifications Enabled');
      expect(toasts[0].description).toBe("You'll now receive notifications for new bookings and appointments.");
    });

    it('should call API subscription endpoint when enabling notifications', async () => {
      // Act
      await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/push/subscribe', {
        subscription: expect.objectContaining({
          endpoint: expect.stringContaining('fcm.googleapis.com'),
          keys: expect.objectContaining({
            p256dh: expect.any(String),
            auth: expect.any(String),
          }),
        }),
      });
    });

    it('should enable test notification button when notifications are ON', async () => {
      // Act
      await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      const status = notificationService.getSubscriptionStatus(testUserId);
      expect(status.subscribed).toBe(true);
      
      // Test notification should be available
      const testResult = await notificationService.sendTestNotification(testUserId);
      expect(testResult.success).toBe(true);
    });

    it('should handle permission denied gracefully', async () => {
      // Arrange
      mockNotification.permission = 'denied';
      
      // Act
      const result = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.subscribed).toBe(false);
      expect(result.error).toBe('User denied notification permission');
    });

    it('should handle service worker unavailable error', async () => {
      // Arrange
      notificationService.simulateServiceWorkerError();
      
      // Act
      const result = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.subscribed).toBe(false);
      expect(result.error).toBe('Service worker not supported');
    });

    it('should handle API subscription failure', async () => {
      // Arrange
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/push/subscribe') {
          return Promise.resolve({ success: false, error: 'Server error' });
        }
        return Promise.resolve({ success: true });
      });
      
      // Act
      const result = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.subscribed).toBe(false);
      expect(result.error).toBe('Server error');
    });

    it('should send test notification successfully when subscribed', async () => {
      // Arrange
      await notificationService.enablePushNotifications(testUserId);
      
      // Act
      const testResult = await notificationService.sendTestNotification(testUserId);
      
      // Assert
      expect(testResult.success).toBe(true);
      expect(testResult.message).toBe('Test notification sent successfully');
      
      const toasts = notificationService.getToastMessages();
      expect(toasts.some(t => t.title === 'Test Notification Sent')).toBe(true);
    });

    it('should handle test notification API failure', async () => {
      // Arrange
      await notificationService.enablePushNotifications(testUserId);
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/push/test') {
          return Promise.resolve({ success: false, error: 'Test failed' });
        }
        return Promise.resolve({ success: true });
      });
      
      // Act
      const testResult = await notificationService.sendTestNotification(testUserId);
      
      // Assert
      expect(testResult.success).toBe(false);
      expect(testResult.error).toBe('Test failed');
    });
  });

  describe('Push Notifications OFF State', () => {
    it('should successfully disable push notifications', async () => {
      // Arrange - First enable notifications
      await notificationService.enablePushNotifications(testUserId);
      notificationService.clearToastMessages();
      
      // Act
      const result = await notificationService.disablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.subscribed).toBe(false);
      expect(result.message).toBe('Push notifications disabled successfully');
      
      const settings = notificationService.getSettings();
      expect(settings.pushNotifications).toBe(false);
      expect(settings.subscribed).toBe(false);
      expect(settings.subscription).toBeUndefined();
    });

    it('should show success toast when push notifications are disabled', async () => {
      // Arrange
      await notificationService.enablePushNotifications(testUserId);
      notificationService.clearToastMessages();
      
      // Act
      await notificationService.disablePushNotifications(testUserId);
      
      // Assert
      const toasts = notificationService.getToastMessages();
      expect(toasts).toHaveLength(1);
      expect(toasts[0].title).toBe('Push Notifications Disabled');
      expect(toasts[0].description).toBe("You'll no longer receive push notifications.");
    });

    it('should call API unsubscribe endpoint when disabling notifications', async () => {
      // Arrange
      await notificationService.enablePushNotifications(testUserId);
      mockApiRequest.mockClear();
      
      // Act
      await notificationService.disablePushNotifications(testUserId);
      
      // Assert
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/push/unsubscribe');
    });

    it('should hide test notification button when notifications are OFF', async () => {
      // Arrange - First enable then disable
      await notificationService.enablePushNotifications(testUserId);
      await notificationService.disablePushNotifications(testUserId);
      
      // Assert
      const status = notificationService.getSubscriptionStatus(testUserId);
      expect(status.subscribed).toBe(false);
      
      // Test notification should not be available
      const testResult = await notificationService.sendTestNotification(testUserId);
      expect(testResult.success).toBe(false);
      expect(testResult.error).toBe('User not subscribed');
    });

    it('should handle API unsubscribe failure', async () => {
      // Arrange
      await notificationService.enablePushNotifications(testUserId);
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/push/unsubscribe') {
          return Promise.resolve({ success: false, error: 'Unsubscribe failed' });
        }
        return Promise.resolve({ success: true });
      });
      
      // Act
      const result = await notificationService.disablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.subscribed).toBe(true);
      expect(result.error).toBe('Unsubscribe failed');
    });

    it('should handle network errors during unsubscribe', async () => {
      // Arrange
      await notificationService.enablePushNotifications(testUserId);
      notificationService.simulateApiError('/api/push/unsubscribe', 'Network error');
      
      // Act
      const result = await notificationService.disablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Sound Effects Settings', () => {
    it('should enable sound effects successfully', () => {
      // Act
      const result = notificationService.toggleSoundEffects(true);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Sound effects enabled successfully');
      
      const settings = notificationService.getSettings();
      expect(settings.soundEffects).toBe(true);
    });

    it('should disable sound effects successfully', () => {
      // Act
      const result = notificationService.toggleSoundEffects(false);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Sound effects disabled successfully');
      
      const settings = notificationService.getSettings();
      expect(settings.soundEffects).toBe(false);
    });

    it('should save sound effects setting to localStorage', () => {
      // Act
      notificationService.toggleSoundEffects(true);
      
      // Assert
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('soundEffects', 'true');
    });

    it('should show appropriate toast for sound effects ON', () => {
      // Act
      notificationService.toggleSoundEffects(true);
      
      // Assert
      const toasts = notificationService.getToastMessages();
      expect(toasts.some(t => t.title === 'Sound Effects Enabled')).toBe(true);
      expect(toasts.some(t => t.description === 'App sounds are now on')).toBe(true);
    });

    it('should show appropriate toast for sound effects OFF', () => {
      // Act
      notificationService.toggleSoundEffects(false);
      
      // Assert
      const toasts = notificationService.getToastMessages();
      expect(toasts.some(t => t.title === 'Sound Effects Disabled')).toBe(true);
      expect(toasts.some(t => t.description === 'App sounds are now off')).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing subscription data gracefully', async () => {
      // Arrange - Remove subscription data
      const serviceWithoutSubscription = new MockNotificationSettingsService();
      serviceWithoutSubscription.resetMocks();
      
      // Act
      const result = await serviceWithoutSubscription.enablePushNotifications('non-existent-user');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Push subscription failed');
    });

    it('should handle multiple rapid toggle operations', async () => {
      // Act - Rapidly toggle on/off
      const enableResult = await notificationService.enablePushNotifications(testUserId);
      const disableResult = await notificationService.disablePushNotifications(testUserId);
      const enableAgainResult = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(enableResult.success).toBe(true);
      expect(disableResult.success).toBe(true);
      expect(enableAgainResult.success).toBe(true);
      
      const finalSettings = notificationService.getSettings();
      expect(finalSettings.subscribed).toBe(true);
    });

    it('should handle browser compatibility issues', async () => {
      // Arrange - Simulate browser without service worker support
      notificationService.simulateServiceWorkerError();
      
      // Act
      const result = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service worker not supported');
    });

    it('should maintain sound effects setting independently of push notifications', async () => {
      // Act
      notificationService.toggleSoundEffects(false);
      await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      const settings = notificationService.getSettings();
      expect(settings.soundEffects).toBe(false);
      expect(settings.subscribed).toBe(true);
    });

    it('should handle permission state changes', async () => {
      // Arrange - Start with granted permission
      mockNotification.permission = 'granted';
      await notificationService.enablePushNotifications(testUserId);
      
      // Act - Change permission to denied and try again
      mockNotification.permission = 'denied';
      const result = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User denied notification permission');
    });

    it('should handle API timeout errors', async () => {
      // Arrange
      mockApiRequest.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });
      
      // Act
      const result = await notificationService.enablePushNotifications(testUserId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full notification workflow end-to-end', async () => {
      // Act - Complete workflow
      const enableResult = await notificationService.enablePushNotifications(testUserId);
      const testResult = await notificationService.sendTestNotification(testUserId);
      const disableResult = await notificationService.disablePushNotifications(testUserId);
      
      // Assert
      expect(enableResult.success).toBe(true);
      expect(testResult.success).toBe(true);
      expect(disableResult.success).toBe(true);
      
      const finalSettings = notificationService.getSettings();
      expect(finalSettings.subscribed).toBe(false);
    });

    it('should handle mixed settings state correctly', async () => {
      // Act - Set different combinations
      await notificationService.enablePushNotifications(testUserId);
      notificationService.toggleSoundEffects(false);
      
      // Assert
      const settings = notificationService.getSettings();
      expect(settings.subscribed).toBe(true);
      expect(settings.soundEffects).toBe(false);
      
      // Verify independent operation
      const testResult = await notificationService.sendTestNotification(testUserId);
      expect(testResult.success).toBe(true);
    });
  });
});