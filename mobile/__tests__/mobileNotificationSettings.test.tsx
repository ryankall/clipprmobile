import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

// Mobile notification settings interfaces
interface MobileNotificationSettings {
  pushEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
  appointmentReminders: boolean;
  bookingConfirmations: boolean;
  messageNotifications: boolean;
  scheduleEnabled: {
    start: string;
    end: string;
    enabled: boolean;
  };
  categories: {
    [key: string]: {
      enabled: boolean;
      priority: 'high' | 'medium' | 'low';
    };
  };
}

interface MobileNotificationPermission {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  granted: boolean;
}

interface MobileNotificationChannel {
  id: string;
  name: string;
  importance: 'high' | 'medium' | 'low';
  sound: boolean;
  vibration: boolean;
  badge: boolean;
}

// Mobile notification service with Expo Notifications
class MobileNotificationService {
  private settings: MobileNotificationSettings;
  private permissions: MobileNotificationPermission;
  private channels: MobileNotificationChannel[] = [];
  private scheduledNotifications: any[] = [];

  constructor() {
    this.settings = {
      pushEnabled: false,
      soundEnabled: true,
      vibrationEnabled: true,
      badgeEnabled: true,
      appointmentReminders: true,
      bookingConfirmations: true,
      messageNotifications: true,
      scheduleEnabled: {
        start: '09:00',
        end: '18:00',
        enabled: true,
      },
      categories: {
        appointments: { enabled: true, priority: 'high' },
        bookings: { enabled: true, priority: 'medium' },
        messages: { enabled: true, priority: 'medium' },
        reminders: { enabled: true, priority: 'low' },
      },
    };

    this.permissions = {
      status: 'undetermined',
      canAskAgain: true,
      granted: false,
    };

    this.setupNotificationChannels();
  }

  private setupNotificationChannels(): void {
    this.channels = [
      {
        id: 'appointments',
        name: 'Appointment Notifications',
        importance: 'high',
        sound: true,
        vibration: true,
        badge: true,
      },
      {
        id: 'bookings',
        name: 'Booking Confirmations',
        importance: 'medium',
        sound: true,
        vibration: false,
        badge: true,
      },
      {
        id: 'messages',
        name: 'Message Notifications',
        importance: 'medium',
        sound: false,
        vibration: true,
        badge: false,
      },
    ];
  }

  async requestPermissions(): Promise<MobileNotificationPermission> {
    // Mock permission request
    if (this.permissions.status === 'undetermined') {
      this.permissions = {
        status: 'granted',
        canAskAgain: false,
        granted: true,
      };
    }
    return this.permissions;
  }

  async getPermissions(): Promise<MobileNotificationPermission> {
    return this.permissions;
  }

  async updateSettings(newSettings: Partial<MobileNotificationSettings>): Promise<MobileNotificationSettings> {
    this.settings = { ...this.settings, ...newSettings };
    
    // Update notification channels based on settings
    if (newSettings.pushEnabled !== undefined) {
      if (newSettings.pushEnabled && !this.permissions.granted) {
        await this.requestPermissions();
      }
    }

    return this.settings;
  }

  getSettings(): MobileNotificationSettings {
    return this.settings;
  }

  async scheduleNotification(
    title: string,
    body: string,
    trigger: any,
    categoryId?: string
  ): Promise<string> {
    if (!this.settings.pushEnabled || !this.permissions.granted) {
      throw new Error('Push notifications not enabled or permitted');
    }

    const category = categoryId ? this.settings.categories[categoryId] : undefined;
    if (category && !category.enabled) {
      throw new Error(`Notifications for category '${categoryId}' are disabled`);
    }

    // Check if notification should be sent based on schedule
    if (this.settings.scheduleEnabled.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(this.settings.scheduleEnabled.start.split(':')[0]);
      const endHour = parseInt(this.settings.scheduleEnabled.end.split(':')[0]);

      if (currentHour < startHour || currentHour >= endHour) {
        // Schedule for next day within hours
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(startHour, 0, 0, 0);
        trigger = nextDay;
      }
    }

    const notificationId = `mobile_notification_${Date.now()}_${Math.random()}`;
    
    const notification = {
      id: notificationId,
      title,
      body,
      trigger,
      categoryId,
      sound: this.settings.soundEnabled,
      vibration: this.settings.vibrationEnabled,
      badge: this.settings.badgeEnabled,
      priority: category?.priority || 'medium',
      createdAt: new Date().toISOString(),
    };

    this.scheduledNotifications.push(notification);
    return notificationId;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    this.scheduledNotifications = this.scheduledNotifications.filter(
      n => n.id !== notificationId
    );
  }

  async cancelAllNotifications(): Promise<void> {
    this.scheduledNotifications = [];
  }

  getScheduledNotifications(): any[] {
    return this.scheduledNotifications;
  }

  async sendTestNotification(): Promise<void> {
    if (!this.settings.pushEnabled || !this.permissions.granted) {
      throw new Error('Push notifications not enabled or permitted');
    }

    await this.scheduleNotification(
      'Test Notification',
      'This is a test notification from Clippr',
      null,
      'reminders'
    );
  }

  async getBadgeCount(): Promise<number> {
    if (!this.settings.badgeEnabled) {
      return 0;
    }
    
    return this.scheduledNotifications.filter(n => n.badge).length;
  }

  async setBadgeCount(count: number): Promise<void> {
    if (this.settings.badgeEnabled) {
      // Mock badge setting
      console.log(`Badge count set to: ${count}`);
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  getNotificationChannels(): MobileNotificationChannel[] {
    return this.channels;
  }

  async updateNotificationChannel(
    channelId: string,
    updates: Partial<MobileNotificationChannel>
  ): Promise<MobileNotificationChannel> {
    const channelIndex = this.channels.findIndex(c => c.id === channelId);
    if (channelIndex === -1) {
      throw new Error(`Channel '${channelId}' not found`);
    }

    this.channels[channelIndex] = { ...this.channels[channelIndex], ...updates };
    return this.channels[channelIndex];
  }
}

// Mock mobile notification settings component
const MockMobileNotificationSettings = ({
  settings,
  onSettingsChange,
  onTestNotification,
  onRequestPermissions,
}: {
  settings: MobileNotificationSettings;
  onSettingsChange: (settings: Partial<MobileNotificationSettings>) => void;
  onTestNotification: () => void;
  onRequestPermissions: () => void;
}) => {
  return (
    <div>
      <div testID="push-notifications-section">
        <button
          testID="push-toggle"
          onPress={() => onSettingsChange({ pushEnabled: !settings.pushEnabled })}
        >
          {settings.pushEnabled ? 'Disable Push' : 'Enable Push'}
        </button>
        
        <button
          testID="request-permissions"
          onPress={onRequestPermissions}
        >
          Request Permissions
        </button>
        
        {settings.pushEnabled && (
          <button
            testID="test-notification"
            onPress={onTestNotification}
          >
            Send Test Notification
          </button>
        )}
      </div>

      <div testID="sound-settings-section">
        <button
          testID="sound-toggle"
          onPress={() => onSettingsChange({ soundEnabled: !settings.soundEnabled })}
        >
          {settings.soundEnabled ? 'Disable Sound' : 'Enable Sound'}
        </button>
        
        <button
          testID="vibration-toggle"
          onPress={() => onSettingsChange({ vibrationEnabled: !settings.vibrationEnabled })}
        >
          {settings.vibrationEnabled ? 'Disable Vibration' : 'Enable Vibration'}
        </button>
      </div>

      <div testID="category-settings-section">
        {Object.entries(settings.categories).map(([category, config]) => (
          <div key={category} testID={`category-${category}`}>
            <button
              testID={`category-${category}-toggle`}
              onPress={() => onSettingsChange({
                categories: {
                  ...settings.categories,
                  [category]: { ...config, enabled: !config.enabled },
                },
              })}
            >
              {config.enabled ? `Disable ${category}` : `Enable ${category}`}
            </button>
          </div>
        ))}
      </div>

      <div testID="schedule-settings-section">
        <button
          testID="schedule-toggle"
          onPress={() => onSettingsChange({
            scheduleEnabled: {
              ...settings.scheduleEnabled,
              enabled: !settings.scheduleEnabled.enabled,
            },
          })}
        >
          {settings.scheduleEnabled.enabled ? 'Disable Schedule' : 'Enable Schedule'}
        </button>
      </div>
    </div>
  );
};

// Test wrapper for mobile notification components
const MobileNotificationTestWrapper = ({ children }: { children: React.ReactNode }) => {
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

describe('Mobile Notification Settings', () => {
  let notificationService: MobileNotificationService;

  beforeEach(() => {
    notificationService = new MobileNotificationService();
    vi.clearAllMocks();
  });

  describe('Mobile Push Notification Permissions', () => {
    it('should request mobile push notification permissions', async () => {
      const initialPermissions = await notificationService.getPermissions();
      expect(initialPermissions.status).toBe('undetermined');
      expect(initialPermissions.granted).toBe(false);

      const newPermissions = await notificationService.requestPermissions();
      expect(newPermissions.status).toBe('granted');
      expect(newPermissions.granted).toBe(true);
      expect(newPermissions.canAskAgain).toBe(false);
    });

    it('should handle permission denial gracefully', async () => {
      // Mock denied permission
      notificationService['permissions'] = {
        status: 'denied',
        canAskAgain: false,
        granted: false,
      };

      const permissions = await notificationService.getPermissions();
      expect(permissions.status).toBe('denied');
      expect(permissions.granted).toBe(false);
    });
  });

  describe('Mobile Notification Settings Management', () => {
    it('should update push notification settings', async () => {
      const newSettings = await notificationService.updateSettings({
        pushEnabled: true,
        soundEnabled: false,
        vibrationEnabled: true,
      });

      expect(newSettings.pushEnabled).toBe(true);
      expect(newSettings.soundEnabled).toBe(false);
      expect(newSettings.vibrationEnabled).toBe(true);
    });

    it('should handle category-specific settings', async () => {
      const newSettings = await notificationService.updateSettings({
        categories: {
          appointments: { enabled: true, priority: 'high' },
          bookings: { enabled: false, priority: 'medium' },
          messages: { enabled: true, priority: 'low' },
          reminders: { enabled: false, priority: 'low' },
        },
      });

      expect(newSettings.categories.appointments.enabled).toBe(true);
      expect(newSettings.categories.bookings.enabled).toBe(false);
      expect(newSettings.categories.messages.priority).toBe('low');
    });

    it('should handle notification schedule settings', async () => {
      const newSettings = await notificationService.updateSettings({
        scheduleEnabled: {
          start: '08:00',
          end: '20:00',
          enabled: true,
        },
      });

      expect(newSettings.scheduleEnabled.start).toBe('08:00');
      expect(newSettings.scheduleEnabled.end).toBe('20:00');
      expect(newSettings.scheduleEnabled.enabled).toBe(true);
    });
  });

  describe('Mobile Notification Scheduling', () => {
    it('should schedule mobile notifications when enabled', async () => {
      await notificationService.updateSettings({ pushEnabled: true });
      await notificationService.requestPermissions();

      const notificationId = await notificationService.scheduleNotification(
        'Test Notification',
        'This is a test message',
        new Date(Date.now() + 60000), // 1 minute from now
        'appointments'
      );

      expect(notificationId).toBeDefined();
      expect(notificationId).toMatch(/^mobile_notification_/);

      const scheduled = notificationService.getScheduledNotifications();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].title).toBe('Test Notification');
      expect(scheduled[0].categoryId).toBe('appointments');
    });

    it('should prevent scheduling when push notifications are disabled', async () => {
      await notificationService.updateSettings({ pushEnabled: false });

      await expect(
        notificationService.scheduleNotification(
          'Test Notification',
          'This is a test message',
          new Date(Date.now() + 60000)
        )
      ).rejects.toThrow('Push notifications not enabled or permitted');
    });

    it('should prevent scheduling for disabled categories', async () => {
      await notificationService.updateSettings({ 
        pushEnabled: true,
        categories: {
          appointments: { enabled: false, priority: 'high' },
          bookings: { enabled: true, priority: 'medium' },
          messages: { enabled: true, priority: 'medium' },
          reminders: { enabled: true, priority: 'low' },
        },
      });
      await notificationService.requestPermissions();

      await expect(
        notificationService.scheduleNotification(
          'Test Notification',
          'This is a test message',
          new Date(Date.now() + 60000),
          'appointments'
        )
      ).rejects.toThrow("Notifications for category 'appointments' are disabled");
    });
  });

  describe('Mobile Notification Scheduling with Time Constraints', () => {
    it('should respect notification schedule hours', async () => {
      await notificationService.updateSettings({ 
        pushEnabled: true,
        scheduleEnabled: {
          start: '09:00',
          end: '18:00',
          enabled: true,
        },
      });
      await notificationService.requestPermissions();

      // Mock current time to be outside schedule (e.g., 8 AM)
      const originalDate = Date;
      const mockDate = new Date('2025-07-15T08:00:00.000Z');
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());

      await notificationService.scheduleNotification(
        'Test Notification',
        'This should be scheduled for later',
        new Date(Date.now() + 60000),
        'appointments'
      );

      const scheduled = notificationService.getScheduledNotifications();
      expect(scheduled).toHaveLength(1);
      
      // Should be rescheduled for next day within hours
      const scheduledTime = new Date(scheduled[0].trigger);
      expect(scheduledTime.getHours()).toBe(9); // 9 AM next day

      // Restore original Date
      global.Date = originalDate;
    });

    it('should allow immediate notifications during schedule hours', async () => {
      await notificationService.updateSettings({ 
        pushEnabled: true,
        scheduleEnabled: {
          start: '09:00',
          end: '18:00',
          enabled: true,
        },
      });
      await notificationService.requestPermissions();

      // Mock current time to be within schedule (e.g., 2 PM)
      const originalDate = Date;
      const mockDate = new Date('2025-07-15T14:00:00.000Z');
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());

      const originalTrigger = new Date(Date.now() + 60000);
      
      await notificationService.scheduleNotification(
        'Test Notification',
        'This should be immediate',
        originalTrigger,
        'appointments'
      );

      const scheduled = notificationService.getScheduledNotifications();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].trigger).toEqual(originalTrigger);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Mobile Notification Cancellation', () => {
    it('should cancel individual mobile notifications', async () => {
      await notificationService.updateSettings({ pushEnabled: true });
      await notificationService.requestPermissions();

      const notificationId = await notificationService.scheduleNotification(
        'Test Notification',
        'This is a test message',
        new Date(Date.now() + 60000)
      );

      await notificationService.cancelNotification(notificationId);

      const scheduled = notificationService.getScheduledNotifications();
      expect(scheduled).toHaveLength(0);
    });

    it('should cancel all mobile notifications', async () => {
      await notificationService.updateSettings({ pushEnabled: true });
      await notificationService.requestPermissions();

      // Schedule multiple notifications
      await notificationService.scheduleNotification(
        'Test 1',
        'Message 1',
        new Date(Date.now() + 60000)
      );
      await notificationService.scheduleNotification(
        'Test 2',
        'Message 2',
        new Date(Date.now() + 120000)
      );

      expect(notificationService.getScheduledNotifications()).toHaveLength(2);

      await notificationService.cancelAllNotifications();

      expect(notificationService.getScheduledNotifications()).toHaveLength(0);
    });
  });

  describe('Mobile Badge Management', () => {
    it('should manage app badge count', async () => {
      await notificationService.updateSettings({ 
        pushEnabled: true,
        badgeEnabled: true,
      });
      await notificationService.requestPermissions();

      // Schedule notifications that should contribute to badge
      await notificationService.scheduleNotification(
        'Badge Test 1',
        'Message 1',
        new Date(Date.now() + 60000)
      );
      await notificationService.scheduleNotification(
        'Badge Test 2',
        'Message 2',
        new Date(Date.now() + 120000)
      );

      const badgeCount = await notificationService.getBadgeCount();
      expect(badgeCount).toBe(2);

      await notificationService.clearBadge();
      const clearedBadgeCount = await notificationService.getBadgeCount();
      expect(clearedBadgeCount).toBe(0);
    });

    it('should not manage badge when disabled', async () => {
      await notificationService.updateSettings({ 
        pushEnabled: true,
        badgeEnabled: false,
      });
      await notificationService.requestPermissions();

      await notificationService.scheduleNotification(
        'Badge Test',
        'Message',
        new Date(Date.now() + 60000)
      );

      const badgeCount = await notificationService.getBadgeCount();
      expect(badgeCount).toBe(0);
    });
  });

  describe('Mobile Test Notification', () => {
    it('should send test notification when enabled', async () => {
      await notificationService.updateSettings({ pushEnabled: true });
      await notificationService.requestPermissions();

      await notificationService.sendTestNotification();

      const scheduled = notificationService.getScheduledNotifications();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].title).toBe('Test Notification');
      expect(scheduled[0].body).toBe('This is a test notification from Clippr');
      expect(scheduled[0].categoryId).toBe('reminders');
    });

    it('should fail to send test notification when disabled', async () => {
      await notificationService.updateSettings({ pushEnabled: false });

      await expect(
        notificationService.sendTestNotification()
      ).rejects.toThrow('Push notifications not enabled or permitted');
    });
  });

  describe('Mobile Notification Channels', () => {
    it('should manage notification channels', async () => {
      const channels = notificationService.getNotificationChannels();
      expect(channels).toHaveLength(3);
      expect(channels[0].id).toBe('appointments');
      expect(channels[0].importance).toBe('high');
    });

    it('should update notification channel settings', async () => {
      const updatedChannel = await notificationService.updateNotificationChannel(
        'appointments',
        { sound: false, vibration: true }
      );

      expect(updatedChannel.sound).toBe(false);
      expect(updatedChannel.vibration).toBe(true);
      expect(updatedChannel.importance).toBe('high'); // Should remain unchanged
    });

    it('should handle invalid channel updates', async () => {
      await expect(
        notificationService.updateNotificationChannel(
          'invalid_channel',
          { sound: false }
        )
      ).rejects.toThrow("Channel 'invalid_channel' not found");
    });
  });

  describe('Mobile Performance and Battery Optimization', () => {
    it('should efficiently handle multiple notification updates', async () => {
      await notificationService.updateSettings({ pushEnabled: true });
      await notificationService.requestPermissions();

      const startTime = performance.now();

      // Schedule 100 notifications
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(notificationService.scheduleNotification(
          `Test ${i}`,
          `Message ${i}`,
          new Date(Date.now() + (i * 60000))
        ));
      }

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(notificationService.getScheduledNotifications()).toHaveLength(100);
    });

    it('should optimize memory usage with large notification sets', async () => {
      await notificationService.updateSettings({ pushEnabled: true });
      await notificationService.requestPermissions();

      const initialMemory = process.memoryUsage().heapUsed;

      // Schedule and cancel many notifications
      for (let i = 0; i < 1000; i++) {
        const id = await notificationService.scheduleNotification(
          `Test ${i}`,
          `Message ${i}`,
          new Date(Date.now() + (i * 60000))
        );
        
        if (i % 2 === 0) {
          await notificationService.cancelNotification(id);
        }
      }

      const afterOperationsMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterOperationsMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Should have 500 notifications left (every other one was cancelled)
      expect(notificationService.getScheduledNotifications()).toHaveLength(500);
    });
  });
});