import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock interfaces for push notification testing
interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotificationService {
  sendNotification(userId: string, payload: PushNotificationPayload): Promise<boolean>;
  subscribeUser(userId: string, subscription: NotificationSubscription): Promise<boolean>;
  unsubscribeUser(userId: string): Promise<boolean>;
  getSubscription(userId: string): Promise<NotificationSubscription | null>;
}

// Mock implementation for testing
class MockPushNotificationService implements PushNotificationService {
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private sentNotifications: Array<{
    userId: string;
    payload: PushNotificationPayload;
    timestamp: Date;
    success: boolean;
  }> = [];

  async sendNotification(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    const subscription = this.subscriptions.get(userId);
    
    if (!subscription) {
      this.sentNotifications.push({
        userId,
        payload,
        timestamp: new Date(),
        success: false
      });
      return false;
    }

    // Simulate push notification sending (deterministic success for testing)
    const success = true;
    
    this.sentNotifications.push({
      userId,
      payload,
      timestamp: new Date(),
      success
    });

    return success;
  }

  async subscribeUser(userId: string, subscription: NotificationSubscription): Promise<boolean> {
    if (!subscription.endpoint || !subscription.keys.p256dh || !subscription.keys.auth) {
      return false;
    }

    this.subscriptions.set(userId, subscription);
    return true;
  }

  async unsubscribeUser(userId: string): Promise<boolean> {
    const had = this.subscriptions.has(userId);
    this.subscriptions.delete(userId);
    return had;
  }

  async getSubscription(userId: string): Promise<NotificationSubscription | null> {
    return this.subscriptions.get(userId) || null;
  }

  // Test helper methods
  getSentNotifications(): Array<{
    userId: string;
    payload: PushNotificationPayload;
    timestamp: Date;
    success: boolean;
  }> {
    return this.sentNotifications;
  }

  clearSentNotifications(): void {
    this.sentNotifications = [];
  }

  getSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  simulateSubscriptionFailure(userId: string): void {
    this.subscriptions.delete(userId);
  }
}

// Mock notification helper functions
async function sendNewBookingRequestNotification(
  userId: string,
  clientName: string,
  serviceRequested: string,
  preferredDate: string,
  preferredTime: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: 'New Booking Request',
    body: `${clientName} requested ${serviceRequested} on ${preferredDate} at ${preferredTime}`,
    data: {
      type: 'booking_request',
      clientName,
      serviceRequested,
      preferredDate,
      preferredTime
    },
    badge: 1,
    icon: '/icon-192x192.png',
    tag: 'booking-request',
    requireInteraction: true
  };

  return await pushNotificationService.sendNotification(userId, payload);
}

async function sendAppointmentConfirmedNotification(
  userId: string,
  clientName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: 'Appointment Confirmed',
    body: `${clientName} confirmed their appointment on ${appointmentDate} at ${appointmentTime}`,
    data: {
      type: 'appointment_confirmed',
      clientName,
      appointmentDate,
      appointmentTime
    },
    badge: 1,
    icon: '/icon-192x192.png',
    tag: 'appointment-confirmed'
  };

  return await pushNotificationService.sendNotification(userId, payload);
}

async function sendAppointmentCancelledNotification(
  userId: string,
  clientName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> {
  const payload: PushNotificationPayload = {
    title: 'Appointment Cancelled',
    body: `${clientName} cancelled their appointment on ${appointmentDate} at ${appointmentTime}`,
    data: {
      type: 'appointment_cancelled',
      clientName,
      appointmentDate,
      appointmentTime
    },
    badge: 1,
    icon: '/icon-192x192.png',
    tag: 'appointment-cancelled'
  };

  return await pushNotificationService.sendNotification(userId, payload);
}

async function sendUpcomingAppointmentReminder(
  userId: string,
  clientName: string,
  serviceType: string,
  appointmentTime: string,
  travelTime?: number
): Promise<boolean> {
  let body = `Upcoming appointment with ${clientName} for ${serviceType} at ${appointmentTime}`;
  
  if (travelTime && travelTime > 0) {
    body += ` (${travelTime} min travel time)`;
  }

  const payload: PushNotificationPayload = {
    title: 'Appointment Reminder',
    body,
    data: {
      type: 'appointment_reminder',
      clientName,
      serviceType,
      appointmentTime,
      travelTime
    },
    badge: 1,
    icon: '/icon-192x192.png',
    tag: 'appointment-reminder'
  };

  return await pushNotificationService.sendNotification(userId, payload);
}

// Test setup
let pushNotificationService: MockPushNotificationService;

describe('Push Notification System', () => {
  beforeEach(() => {
    pushNotificationService = new MockPushNotificationService();
    vi.clearAllMocks();
  });

  describe('Subscription Management', () => {
    it('should successfully subscribe a user with valid subscription data', async () => {
      const userId = 'barber-123';
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      const result = await pushNotificationService.subscribeUser(userId, subscription);
      expect(result).toBe(true);
      expect(pushNotificationService.getSubscriptionsCount()).toBe(1);

      const retrieved = await pushNotificationService.getSubscription(userId);
      expect(retrieved).toEqual(subscription);
    });

    it('should reject subscription with invalid data', async () => {
      const userId = 'barber-123';
      const invalidSubscription: NotificationSubscription = {
        endpoint: '',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      const result = await pushNotificationService.subscribeUser(userId, invalidSubscription);
      expect(result).toBe(false);
      expect(pushNotificationService.getSubscriptionsCount()).toBe(0);
    });

    it('should successfully unsubscribe a user', async () => {
      const userId = 'barber-123';
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser(userId, subscription);
      expect(pushNotificationService.getSubscriptionsCount()).toBe(1);

      const result = await pushNotificationService.unsubscribeUser(userId);
      expect(result).toBe(true);
      expect(pushNotificationService.getSubscriptionsCount()).toBe(0);

      const retrieved = await pushNotificationService.getSubscription(userId);
      expect(retrieved).toBeNull();
    });

    it('should return false when unsubscribing non-existent user', async () => {
      const result = await pushNotificationService.unsubscribeUser('nonexistent-user');
      expect(result).toBe(false);
    });

    it('should handle multiple user subscriptions independently', async () => {
      const subscription1: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/user1',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      const subscription2: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/user2',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-1', subscription1);
      await pushNotificationService.subscribeUser('barber-2', subscription2);

      expect(pushNotificationService.getSubscriptionsCount()).toBe(2);

      const retrieved1 = await pushNotificationService.getSubscription('barber-1');
      const retrieved2 = await pushNotificationService.getSubscription('barber-2');

      expect(retrieved1).toEqual(subscription1);
      expect(retrieved2).toEqual(subscription2);
    });
  });

  describe('New Booking Request Notifications', () => {
    beforeEach(async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };
      await pushNotificationService.subscribeUser('barber-123', subscription);
    });

    it('should send booking request notification with correct payload', async () => {
      const result = await sendNewBookingRequestNotification(
        'barber-123',
        'John Doe',
        'Haircut',
        '2025-07-10',
        '2:00 PM'
      );

      expect(result).toBe(true);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);

      const notification = sentNotifications[0];
      expect(notification.userId).toBe('barber-123');
      expect(notification.payload.title).toBe('New Booking Request');
      expect(notification.payload.body).toBe('John Doe requested Haircut on 2025-07-10 at 2:00 PM');
      expect(notification.payload.data).toEqual({
        type: 'booking_request',
        clientName: 'John Doe',
        serviceRequested: 'Haircut',
        preferredDate: '2025-07-10',
        preferredTime: '2:00 PM'
      });
      expect(notification.payload.requireInteraction).toBe(true);
    });

    it('should fail to send notification to unsubscribed user', async () => {
      const result = await sendNewBookingRequestNotification(
        'unsubscribed-barber',
        'John Doe',
        'Haircut',
        '2025-07-10',
        '2:00 PM'
      );

      expect(result).toBe(false);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);
      expect(sentNotifications[0].success).toBe(false);
    });

    it('should handle multiple booking request notifications', async () => {
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');
      await sendNewBookingRequestNotification('barber-123', 'Jane Smith', 'Beard Trim', '2025-07-11', '3:00 PM');
      await sendNewBookingRequestNotification('barber-123', 'Bob Johnson', 'Buzz Cut', '2025-07-12', '4:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(3);

      expect(sentNotifications[0].payload.data?.clientName).toBe('John Doe');
      expect(sentNotifications[1].payload.data?.clientName).toBe('Jane Smith');
      expect(sentNotifications[2].payload.data?.clientName).toBe('Bob Johnson');
    });

    it('should use correct notification tag for booking requests', async () => {
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications[0].payload.tag).toBe('booking-request');
    });
  });

  describe('Appointment Confirmed Notifications', () => {
    beforeEach(async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };
      await pushNotificationService.subscribeUser('barber-123', subscription);
    });

    it('should send appointment confirmed notification with correct payload', async () => {
      const result = await sendAppointmentConfirmedNotification(
        'barber-123',
        'John Doe',
        'Wednesday, July 10',
        '2:00 PM'
      );

      expect(result).toBe(true);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);

      const notification = sentNotifications[0];
      expect(notification.payload.title).toBe('Appointment Confirmed');
      expect(notification.payload.body).toBe('John Doe confirmed their appointment on Wednesday, July 10 at 2:00 PM');
      expect(notification.payload.data).toEqual({
        type: 'appointment_confirmed',
        clientName: 'John Doe',
        appointmentDate: 'Wednesday, July 10',
        appointmentTime: '2:00 PM'
      });
    });

    it('should use correct notification tag for confirmations', async () => {
      await sendAppointmentConfirmedNotification('barber-123', 'John Doe', 'Wednesday, July 10', '2:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications[0].payload.tag).toBe('appointment-confirmed');
    });

    it('should not require interaction for confirmation notifications', async () => {
      await sendAppointmentConfirmedNotification('barber-123', 'John Doe', 'Wednesday, July 10', '2:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications[0].payload.requireInteraction).toBeUndefined();
    });
  });

  describe('Appointment Cancelled Notifications', () => {
    beforeEach(async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };
      await pushNotificationService.subscribeUser('barber-123', subscription);
    });

    it('should send appointment cancelled notification with correct payload', async () => {
      const result = await sendAppointmentCancelledNotification(
        'barber-123',
        'John Doe',
        'Wednesday, July 10',
        '2:00 PM'
      );

      expect(result).toBe(true);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);

      const notification = sentNotifications[0];
      expect(notification.payload.title).toBe('Appointment Cancelled');
      expect(notification.payload.body).toBe('John Doe cancelled their appointment on Wednesday, July 10 at 2:00 PM');
      expect(notification.payload.data).toEqual({
        type: 'appointment_cancelled',
        clientName: 'John Doe',
        appointmentDate: 'Wednesday, July 10',
        appointmentTime: '2:00 PM'
      });
    });

    it('should use correct notification tag for cancellations', async () => {
      await sendAppointmentCancelledNotification('barber-123', 'John Doe', 'Wednesday, July 10', '2:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications[0].payload.tag).toBe('appointment-cancelled');
    });

    it('should handle cancellation by both client and barber', async () => {
      // Client cancellation
      await sendAppointmentCancelledNotification('barber-123', 'John Doe', 'Wednesday, July 10', '2:00 PM');
      
      // Barber cancellation
      await sendAppointmentCancelledNotification('barber-123', 'Jane Smith', 'Thursday, July 11', '3:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(2);

      expect(sentNotifications[0].payload.data?.clientName).toBe('John Doe');
      expect(sentNotifications[1].payload.data?.clientName).toBe('Jane Smith');
    });
  });

  describe('Appointment Reminder Notifications', () => {
    beforeEach(async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };
      await pushNotificationService.subscribeUser('barber-123', subscription);
    });

    it('should send appointment reminder notification without travel time', async () => {
      const result = await sendUpcomingAppointmentReminder(
        'barber-123',
        'John Doe',
        'Haircut',
        '2:00 PM'
      );

      expect(result).toBe(true);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);

      const notification = sentNotifications[0];
      expect(notification.payload.title).toBe('Appointment Reminder');
      expect(notification.payload.body).toBe('Upcoming appointment with John Doe for Haircut at 2:00 PM');
      expect(notification.payload.data).toEqual({
        type: 'appointment_reminder',
        clientName: 'John Doe',
        serviceType: 'Haircut',
        appointmentTime: '2:00 PM',
        travelTime: undefined
      });
    });

    it('should send appointment reminder notification with travel time', async () => {
      const result = await sendUpcomingAppointmentReminder(
        'barber-123',
        'John Doe',
        'Haircut',
        '2:00 PM',
        25
      );

      expect(result).toBe(true);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);

      const notification = sentNotifications[0];
      expect(notification.payload.title).toBe('Appointment Reminder');
      expect(notification.payload.body).toBe('Upcoming appointment with John Doe for Haircut at 2:00 PM (25 min travel time)');
      expect(notification.payload.data).toEqual({
        type: 'appointment_reminder',
        clientName: 'John Doe',
        serviceType: 'Haircut',
        appointmentTime: '2:00 PM',
        travelTime: 25
      });
    });

    it('should use correct notification tag for reminders', async () => {
      await sendUpcomingAppointmentReminder('barber-123', 'John Doe', 'Haircut', '2:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications[0].payload.tag).toBe('appointment-reminder');
    });

    it('should handle multiple reminders for different appointments', async () => {
      await sendUpcomingAppointmentReminder('barber-123', 'John Doe', 'Haircut', '2:00 PM', 15);
      await sendUpcomingAppointmentReminder('barber-123', 'Jane Smith', 'Beard Trim', '3:00 PM', 20);
      await sendUpcomingAppointmentReminder('barber-123', 'Bob Johnson', 'Buzz Cut', '4:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(3);

      expect(sentNotifications[0].payload.data?.travelTime).toBe(15);
      expect(sentNotifications[1].payload.data?.travelTime).toBe(20);
      expect(sentNotifications[2].payload.data?.travelTime).toBeUndefined();
    });
  });

  describe('Account Isolation', () => {
    it('should maintain separate notification subscriptions for different barbers', async () => {
      const subscription1: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/barber1',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      const subscription2: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/barber2',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-1', subscription1);
      await pushNotificationService.subscribeUser('barber-2', subscription2);

      // Send notification to barber-1
      await sendNewBookingRequestNotification('barber-1', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      // Send notification to barber-2
      await sendNewBookingRequestNotification('barber-2', 'Jane Smith', 'Beard Trim', '2025-07-11', '3:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(2);

      expect(sentNotifications[0].userId).toBe('barber-1');
      expect(sentNotifications[1].userId).toBe('barber-2');
    });

    it('should not send notifications to other barbers', async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/barber1',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-1', subscription);

      // Try to send notification to different barber
      const result = await sendNewBookingRequestNotification('barber-2', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      expect(result).toBe(false);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);
      expect(sentNotifications[0].success).toBe(false);
      expect(sentNotifications[0].userId).toBe('barber-2');
    });
  });

  describe('Error Handling', () => {
    it('should handle notification sending failures gracefully', async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-123', subscription);

      // Simulate subscription failure
      pushNotificationService.simulateSubscriptionFailure('barber-123');

      const result = await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      expect(result).toBe(false);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);
      expect(sentNotifications[0].success).toBe(false);
    });

    it('should handle missing subscription data gracefully', async () => {
      const result = await sendNewBookingRequestNotification('nonexistent-barber', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      expect(result).toBe(false);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);
      expect(sentNotifications[0].success).toBe(false);
    });

    it('should handle empty or invalid notification data', async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-123', subscription);

      // Test with empty client name
      const result = await sendNewBookingRequestNotification('barber-123', '', 'Haircut', '2025-07-10', '2:00 PM');

      expect(result).toBe(true); // Should still send, even with empty client name

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);
      expect(sentNotifications[0].payload.body).toBe(' requested Haircut on 2025-07-10 at 2:00 PM');
    });
  });

  describe('Notification Payload Validation', () => {
    beforeEach(async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };
      await pushNotificationService.subscribeUser('barber-123', subscription);
    });

    it('should include badge count in all notifications', async () => {
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications[0].payload.badge).toBe(1);
    });

    it('should include icon in all notifications', async () => {
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications[0].payload.icon).toBe('/icon-192x192.png');
    });

    it('should include proper data structure in all notifications', async () => {
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');
      await sendAppointmentConfirmedNotification('barber-123', 'Jane Smith', 'Wednesday, July 10', '2:00 PM');
      await sendAppointmentCancelledNotification('barber-123', 'Bob Johnson', 'Thursday, July 11', '3:00 PM');
      await sendUpcomingAppointmentReminder('barber-123', 'Alice Brown', 'Beard Trim', '4:00 PM', 15);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(4);

      // Check that all notifications have proper data structure
      sentNotifications.forEach(notification => {
        expect(notification.payload.data).toBeDefined();
        expect(notification.payload.data?.type).toBeDefined();
        expect(notification.payload.data?.clientName).toBeDefined();
      });
    });

    it('should use unique tags for different notification types', async () => {
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');
      await sendAppointmentConfirmedNotification('barber-123', 'Jane Smith', 'Wednesday, July 10', '2:00 PM');
      await sendAppointmentCancelledNotification('barber-123', 'Bob Johnson', 'Thursday, July 11', '3:00 PM');
      await sendUpcomingAppointmentReminder('barber-123', 'Alice Brown', 'Beard Trim', '4:00 PM');

      const sentNotifications = pushNotificationService.getSentNotifications();
      const tags = sentNotifications.map(n => n.payload.tag);

      expect(tags).toContain('booking-request');
      expect(tags).toContain('appointment-confirmed');
      expect(tags).toContain('appointment-cancelled');
      expect(tags).toContain('appointment-reminder');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent notifications', async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-123', subscription);

      // Send 10 notifications concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(sendNewBookingRequestNotification(`barber-123`, `Client ${i}`, 'Haircut', '2025-07-10', '2:00 PM'));
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r === true)).toBe(true);

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(10);
    });

    it('should handle large number of subscriptions', async () => {
      const subscriptions: NotificationSubscription[] = [];
      
      // Create 100 subscriptions
      for (let i = 0; i < 100; i++) {
        const subscription: NotificationSubscription = {
          endpoint: `https://fcm.googleapis.com/fcm/send/user${i}`,
          keys: {
            p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
            auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
          }
        };
        subscriptions.push(subscription);
        await pushNotificationService.subscribeUser(`barber-${i}`, subscription);
      }

      expect(pushNotificationService.getSubscriptionsCount()).toBe(100);

      // Send notifications to all subscriptions
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(sendNewBookingRequestNotification(`barber-${i}`, `Client ${i}`, 'Haircut', '2025-07-10', '2:00 PM'));
      }

      const results = await Promise.all(promises);
      expect(results.filter(r => r === true).length).toBeGreaterThan(80); // Allow for some random failures

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(100);
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clear sent notifications when requested', async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-123', subscription);
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');

      expect(pushNotificationService.getSentNotifications()).toHaveLength(1);

      pushNotificationService.clearSentNotifications();
      expect(pushNotificationService.getSentNotifications()).toHaveLength(0);
    });

    it('should track notification timestamps', async () => {
      const subscription: NotificationSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abcd1234',
        keys: {
          p256dh: 'BNbN3u5jDuF4mLrhqrKjMLr4J5iZ8jQJ',
          auth: 'WgjdHZNjGVCN6hJ9sP7LXA'
        }
      };

      await pushNotificationService.subscribeUser('barber-123', subscription);
      
      const before = new Date();
      await sendNewBookingRequestNotification('barber-123', 'John Doe', 'Haircut', '2025-07-10', '2:00 PM');
      const after = new Date();

      const sentNotifications = pushNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);
      
      const timestamp = sentNotifications[0].timestamp;
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});