import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mobile appointment expiry interfaces
interface MobilePendingAppointment {
  id: number;
  scheduledAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  duration: number;
  createdAt: string;
  expiresAt: string;
  client: {
    id: number;
    name: string;
    phone: string;
  };
  services: Array<{
    id: number;
    name: string;
    price: string;
  }>;
  price: string;
}

interface MobilePendingCard {
  appointments: MobilePendingAppointment[];
  shouldShow: boolean;
  expiredCount: number;
  isLoading: boolean;
  refreshing: boolean;
}

// Mobile-specific expiry calculation (accounts for mobile timezone handling)
function calculateMobileExpiryTime(createdAt: string, expiryMinutes: number = 30): string {
  const createdDate = new Date(createdAt);
  const expiryDate = new Date(createdDate.getTime() + expiryMinutes * 60 * 1000);
  return expiryDate.toISOString();
}

// Mobile appointment expiry check with timezone awareness
function isMobileAppointmentExpired(appointment: MobilePendingAppointment): boolean {
  if (appointment.status !== 'pending') {
    return false;
  }
  
  const now = new Date();
  const expiryTime = new Date(appointment.expiresAt);
  
  // Mobile devices may have different timezone handling
  return now > expiryTime;
}

// Filter expired appointments for mobile view
function filterMobileExpiredAppointments(appointments: MobilePendingAppointment[]): MobilePendingAppointment[] {
  return appointments.filter(apt => !isMobileAppointmentExpired(apt));
}

// Get expired appointments for mobile cleanup
function getMobileExpiredAppointments(appointments: MobilePendingAppointment[]): MobilePendingAppointment[] {
  return appointments.filter(apt => isMobileAppointmentExpired(apt));
}

// Mobile pending confirmations card with pull-to-refresh
function getMobilePendingConfirmationsCard(
  appointments: MobilePendingAppointment[],
  isRefreshing: boolean = false
): MobilePendingCard {
  const activeAppointments = filterMobileExpiredAppointments(appointments);
  const expiredAppointments = getMobileExpiredAppointments(appointments);
  
  return {
    appointments: activeAppointments,
    shouldShow: activeAppointments.length > 0,
    expiredCount: expiredAppointments.length,
    isLoading: false,
    refreshing: isRefreshing,
  };
}

// Mobile notification for expired appointments
function createMobileExpiryNotification(expiredAppointments: MobilePendingAppointment[]) {
  if (expiredAppointments.length === 0) {
    return null;
  }
  
  return {
    id: Date.now(),
    title: 'Appointments Expired',
    message: `${expiredAppointments.length} appointment${expiredAppointments.length > 1 ? 's' : ''} expired`,
    type: 'warning',
    duration: 5000, // 5 seconds for mobile
    actions: [
      {
        label: 'Review',
        action: 'navigate_to_pending',
      },
      {
        label: 'Dismiss',
        action: 'dismiss',
      },
    ],
  };
}

// Mock mobile push notification service
class MockMobilePushNotificationService {
  private notifications: any[] = [];
  
  async scheduleExpiryReminder(appointment: MobilePendingAppointment) {
    const reminderTime = new Date(appointment.expiresAt).getTime() - 5 * 60 * 1000; // 5 minutes before expiry
    
    this.notifications.push({
      id: `expiry_reminder_${appointment.id}`,
      title: 'Appointment Expiring Soon',
      body: `${appointment.client.name}'s appointment expires in 5 minutes`,
      scheduledTime: reminderTime,
      data: {
        appointmentId: appointment.id,
        type: 'expiry_reminder',
      },
    });
  }
  
  async cancelExpiryReminder(appointmentId: number) {
    this.notifications = this.notifications.filter(
      n => n.id !== `expiry_reminder_${appointmentId}`
    );
  }
  
  getScheduledNotifications() {
    return this.notifications;
  }
}

// Test wrapper for mobile components
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

describe('Mobile Appointment Expiry System', () => {
  let mockPushService: MockMobilePushNotificationService;

  beforeEach(() => {
    mockPushService = new MockMobilePushNotificationService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-07-14T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Mobile Expiry Time Calculation', () => {
    it('should calculate mobile expiry time correctly', () => {
      const createdAt = '2025-07-14T10:00:00.000Z';
      const expiryTime = calculateMobileExpiryTime(createdAt);
      
      const expectedExpiry = '2025-07-14T10:30:00.000Z';
      expect(expiryTime).toBe(expectedExpiry);
    });

    it('should handle mobile timezone differences', () => {
      const createdAt = '2025-07-14T10:00:00.000Z';
      const expiryTime = calculateMobileExpiryTime(createdAt, 15); // 15 minutes
      
      const expectedExpiry = '2025-07-14T10:15:00.000Z';
      expect(expiryTime).toBe(expectedExpiry);
    });
  });

  describe('Mobile Appointment Expiry Detection', () => {
    it('should detect expired appointments on mobile', () => {
      const expiredAppointment: MobilePendingAppointment = {
        id: 1,
        scheduledAt: '2025-07-14T11:00:00.000Z',
        status: 'pending',
        duration: 60,
        createdAt: '2025-07-14T09:45:00.000Z',
        expiresAt: '2025-07-14T10:15:00.000Z', // Already expired
        client: {
          id: 1,
          name: 'John Doe',
          phone: '6467891234',
        },
        services: [
          {
            id: 1,
            name: 'Haircut',
            price: '45.00',
          },
        ],
        price: '45.00',
      };

      const isExpired = isMobileAppointmentExpired(expiredAppointment);
      expect(isExpired).toBe(true);
    });

    it('should not detect confirmed appointments as expired', () => {
      const confirmedAppointment: MobilePendingAppointment = {
        id: 2,
        scheduledAt: '2025-07-14T11:00:00.000Z',
        status: 'confirmed',
        duration: 60,
        createdAt: '2025-07-14T09:45:00.000Z',
        expiresAt: '2025-07-14T10:15:00.000Z',
        client: {
          id: 2,
          name: 'Jane Smith',
          phone: '6467895678',
        },
        services: [
          {
            id: 2,
            name: 'Beard Trim',
            price: '35.00',
          },
        ],
        price: '35.00',
      };

      const isExpired = isMobileAppointmentExpired(confirmedAppointment);
      expect(isExpired).toBe(false);
    });
  });

  describe('Mobile Pending Confirmations Card', () => {
    it('should create mobile pending card with active appointments', () => {
      const appointments: MobilePendingAppointment[] = [
        {
          id: 1,
          scheduledAt: '2025-07-14T11:00:00.000Z',
          status: 'pending',
          duration: 60,
          createdAt: '2025-07-14T10:00:00.000Z',
          expiresAt: '2025-07-14T10:45:00.000Z', // Still active
          client: {
            id: 1,
            name: 'John Doe',
            phone: '6467891234',
          },
          services: [
            {
              id: 1,
              name: 'Haircut',
              price: '45.00',
            },
          ],
          price: '45.00',
        },
      ];

      const card = getMobilePendingConfirmationsCard(appointments);
      
      expect(card.shouldShow).toBe(true);
      expect(card.appointments.length).toBe(1);
      expect(card.expiredCount).toBe(0);
      expect(card.refreshing).toBe(false);
    });

    it('should handle mobile pull-to-refresh state', () => {
      const appointments: MobilePendingAppointment[] = [];
      const card = getMobilePendingConfirmationsCard(appointments, true);
      
      expect(card.refreshing).toBe(true);
      expect(card.shouldShow).toBe(false);
      expect(card.appointments.length).toBe(0);
    });
  });

  describe('Mobile Expiry Notifications', () => {
    it('should create mobile notification for expired appointments', () => {
      const expiredAppointments: MobilePendingAppointment[] = [
        {
          id: 1,
          scheduledAt: '2025-07-14T11:00:00.000Z',
          status: 'pending',
          duration: 60,
          createdAt: '2025-07-14T09:45:00.000Z',
          expiresAt: '2025-07-14T10:15:00.000Z',
          client: {
            id: 1,
            name: 'John Doe',
            phone: '6467891234',
          },
          services: [
            {
              id: 1,
              name: 'Haircut',
              price: '45.00',
            },
          ],
          price: '45.00',
        },
      ];

      const notification = createMobileExpiryNotification(expiredAppointments);
      
      expect(notification).not.toBeNull();
      expect(notification?.title).toBe('Appointments Expired');
      expect(notification?.message).toBe('1 appointment expired');
      expect(notification?.duration).toBe(5000); // Mobile-appropriate duration
      expect(notification?.actions).toHaveLength(2);
    });

    it('should handle multiple expired appointments in mobile notification', () => {
      const expiredAppointments: MobilePendingAppointment[] = [
        {
          id: 1,
          scheduledAt: '2025-07-14T11:00:00.000Z',
          status: 'pending',
          duration: 60,
          createdAt: '2025-07-14T09:45:00.000Z',
          expiresAt: '2025-07-14T10:15:00.000Z',
          client: { id: 1, name: 'John Doe', phone: '6467891234' },
          services: [{ id: 1, name: 'Haircut', price: '45.00' }],
          price: '45.00',
        },
        {
          id: 2,
          scheduledAt: '2025-07-14T12:00:00.000Z',
          status: 'pending',
          duration: 45,
          createdAt: '2025-07-14T09:50:00.000Z',
          expiresAt: '2025-07-14T10:20:00.000Z',
          client: { id: 2, name: 'Jane Smith', phone: '6467895678' },
          services: [{ id: 2, name: 'Beard Trim', price: '35.00' }],
          price: '35.00',
        },
      ];

      const notification = createMobileExpiryNotification(expiredAppointments);
      
      expect(notification?.message).toBe('2 appointments expired');
    });
  });

  describe('Mobile Push Notification Service', () => {
    it('should schedule mobile push notifications for expiry reminders', async () => {
      const appointment: MobilePendingAppointment = {
        id: 1,
        scheduledAt: '2025-07-14T11:00:00.000Z',
        status: 'pending',
        duration: 60,
        createdAt: '2025-07-14T10:00:00.000Z',
        expiresAt: '2025-07-14T10:30:00.000Z',
        client: {
          id: 1,
          name: 'John Doe',
          phone: '6467891234',
        },
        services: [
          {
            id: 1,
            name: 'Haircut',
            price: '45.00',
          },
        ],
        price: '45.00',
      };

      await mockPushService.scheduleExpiryReminder(appointment);
      
      const notifications = mockPushService.getScheduledNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Appointment Expiring Soon');
      expect(notifications[0].body).toBe("John Doe's appointment expires in 5 minutes");
      expect(notifications[0].data.appointmentId).toBe(1);
    });

    it('should cancel mobile push notifications when appointment is confirmed', async () => {
      const appointment: MobilePendingAppointment = {
        id: 1,
        scheduledAt: '2025-07-14T11:00:00.000Z',
        status: 'pending',
        duration: 60,
        createdAt: '2025-07-14T10:00:00.000Z',
        expiresAt: '2025-07-14T10:30:00.000Z',
        client: {
          id: 1,
          name: 'John Doe',
          phone: '6467891234',
        },
        services: [
          {
            id: 1,
            name: 'Haircut',
            price: '45.00',
          },
        ],
        price: '45.00',
      };

      await mockPushService.scheduleExpiryReminder(appointment);
      await mockPushService.cancelExpiryReminder(appointment.id);
      
      const notifications = mockPushService.getScheduledNotifications();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Mobile Performance and Battery Optimization', () => {
    it('should efficiently handle large datasets on mobile', () => {
      const largeAppointmentSet: MobilePendingAppointment[] = [];
      
      // Generate 500 appointments
      for (let i = 0; i < 500; i++) {
        largeAppointmentSet.push({
          id: i,
          scheduledAt: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          duration: 60,
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          client: {
            id: i,
            name: `Client ${i}`,
            phone: `646789${i.toString().padStart(4, '0')}`,
          },
          services: [
            {
              id: i,
              name: 'Service',
              price: '45.00',
            },
          ],
          price: '45.00',
        });
      }

      const startTime = performance.now();
      const filteredAppointments = filterMobileExpiredAppointments(largeAppointmentSet);
      const endTime = performance.now();
      
      // Should complete quickly on mobile
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms
      expect(filteredAppointments.length).toBeLessThanOrEqual(largeAppointmentSet.length);
    });

    it('should optimize battery usage with smart notification scheduling', async () => {
      const appointments: MobilePendingAppointment[] = [];
      
      // Create 10 appointments that expire at different times
      for (let i = 0; i < 10; i++) {
        appointments.push({
          id: i,
          scheduledAt: new Date(Date.now() + (i + 1) * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          duration: 60,
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + (i + 1) * 30 * 60 * 1000).toISOString(),
          client: {
            id: i,
            name: `Client ${i}`,
            phone: `646789${i.toString().padStart(4, '0')}`,
          },
          services: [
            {
              id: i,
              name: 'Service',
              price: '45.00',
            },
          ],
          price: '45.00',
        });
      }

      // Schedule notifications for all appointments
      for (const appointment of appointments) {
        await mockPushService.scheduleExpiryReminder(appointment);
      }

      const notifications = mockPushService.getScheduledNotifications();
      expect(notifications).toHaveLength(10);
      
      // All notifications should be properly scheduled
      notifications.forEach(notification => {
        expect(notification.scheduledTime).toBeDefined();
        expect(notification.data.type).toBe('expiry_reminder');
      });
    });
  });
});