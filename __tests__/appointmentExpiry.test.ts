import { describe, it, expect, beforeEach, vi } from 'vitest';

interface PendingAppointment {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  duration: number;
  createdAt: Date;
  expiresAt: Date;
}

interface PendingCard {
  appointments: PendingAppointment[];
  shouldShow: boolean;
  expiredCount: number;
}

// Helper function to calculate expiry time (30 minutes from creation)
function calculateExpiryTime(createdAt: Date, expiryMinutes: number = 30): Date {
  return new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
}

// Helper function to check if appointment is expired
function isAppointmentExpired(appointment: PendingAppointment): boolean {
  if (appointment.status !== 'pending') {
    return false;
  }
  
  return new Date() > appointment.expiresAt;
}

// Helper function to filter expired appointments from pending list
function filterExpiredAppointments(appointments: PendingAppointment[]): PendingAppointment[] {
  return appointments.filter(apt => !isAppointmentExpired(apt));
}

// Helper function to get expired appointments for cleanup
function getExpiredAppointments(appointments: PendingAppointment[]): PendingAppointment[] {
  return appointments.filter(apt => isAppointmentExpired(apt));
}

// Helper function to simulate pending confirmations card logic
function getPendingConfirmationsCard(appointments: PendingAppointment[]): PendingCard {
  const activeAppointments = filterExpiredAppointments(appointments);
  const expiredAppointments = getExpiredAppointments(appointments);
  
  return {
    appointments: activeAppointments,
    shouldShow: activeAppointments.length > 0,
    expiredCount: expiredAppointments.length
  };
}

// Mock current time for consistent testing
const getCurrentTime = () => new Date('2025-07-04T10:30:00.000Z');

describe('Appointment Expiry System', () => {
  beforeEach(() => {
    // Reset time to fixed point for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(getCurrentTime());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Expiry Time Calculation', () => {
    it('should calculate expiry time correctly (30 minutes from creation)', () => {
      const createdAt = new Date('2025-07-04T10:00:00.000Z');
      const expiryTime = calculateExpiryTime(createdAt);
      
      const expectedExpiry = new Date('2025-07-04T10:30:00.000Z');
      expect(expiryTime).toEqual(expectedExpiry);
    });

    it('should handle custom expiry duration', () => {
      const createdAt = new Date('2025-07-04T10:00:00.000Z');
      const expiryTime = calculateExpiryTime(createdAt, 45); // 45 minutes
      
      const expectedExpiry = new Date('2025-07-04T10:45:00.000Z');
      expect(expiryTime).toEqual(expectedExpiry);
    });
  });

  describe('Appointment Expiry Detection', () => {
    it('should detect expired pending appointments', () => {
      const now = getCurrentTime();
      
      // Appointment created 35 minutes ago (should be expired)
      const expiredAppointment: PendingAppointment = {
        id: 1,
        userId: 3,
        clientId: 31,
        scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
        status: 'pending',
        duration: 20,
        createdAt: new Date('2025-07-04T09:55:00.000Z'), // 35 minutes ago
        expiresAt: calculateExpiryTime(new Date('2025-07-04T09:55:00.000Z'))
      };
      
      expect(isAppointmentExpired(expiredAppointment)).toBe(true);
    });

    it('should not mark non-expired pending appointments as expired', () => {
      const now = getCurrentTime();
      
      // Appointment created 20 minutes ago (should still be active)
      const activeAppointment: PendingAppointment = {
        id: 2,
        userId: 3,
        clientId: 31,
        scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
        status: 'pending',
        duration: 20,
        createdAt: new Date('2025-07-04T10:10:00.000Z'), // 20 minutes ago
        expiresAt: calculateExpiryTime(new Date('2025-07-04T10:10:00.000Z'))
      };
      
      expect(isAppointmentExpired(activeAppointment)).toBe(false);
    });

    it('should not mark confirmed appointments as expired', () => {
      const now = getCurrentTime();
      
      // Confirmed appointment from 1 hour ago (should not be considered for expiry)
      const confirmedAppointment: PendingAppointment = {
        id: 3,
        userId: 3,
        clientId: 31,
        scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
        status: 'confirmed',
        duration: 20,
        createdAt: new Date('2025-07-04T09:30:00.000Z'), // 1 hour ago
        expiresAt: calculateExpiryTime(new Date('2025-07-04T09:30:00.000Z'))
      };
      
      expect(isAppointmentExpired(confirmedAppointment)).toBe(false);
    });
  });

  describe('Pending Confirmations Card Auto-Removal', () => {
    it('should remove expired appointments from pending confirmations card', () => {
      const appointments: PendingAppointment[] = [
        // Expired appointment (created 35 minutes ago)
        {
          id: 1,
          userId: 3,
          clientId: 31,
          scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
          status: 'pending',
          duration: 20,
          createdAt: new Date('2025-07-04T09:55:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T09:55:00.000Z'))
        },
        // Active appointment (created 15 minutes ago)
        {
          id: 2,
          userId: 3,
          clientId: 32,
          scheduledAt: new Date('2025-07-04T11:30:00.000Z'),
          status: 'pending',
          duration: 30,
          createdAt: new Date('2025-07-04T10:15:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T10:15:00.000Z'))
        }
      ];

      const card = getPendingConfirmationsCard(appointments);
      
      expect(card.appointments).toHaveLength(1);
      expect(card.appointments[0].id).toBe(2);
      expect(card.shouldShow).toBe(true);
      expect(card.expiredCount).toBe(1);
    });

    it('should hide pending confirmations card when all appointments are expired', () => {
      const appointments: PendingAppointment[] = [
        // Expired appointment 1
        {
          id: 1,
          userId: 3,
          clientId: 31,
          scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
          status: 'pending',
          duration: 20,
          createdAt: new Date('2025-07-04T09:55:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T09:55:00.000Z'))
        },
        // Expired appointment 2
        {
          id: 2,
          userId: 3,
          clientId: 32,
          scheduledAt: new Date('2025-07-04T11:30:00.000Z'),
          status: 'pending',
          duration: 30,
          createdAt: new Date('2025-07-04T09:50:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T09:50:00.000Z'))
        }
      ];

      const card = getPendingConfirmationsCard(appointments);
      
      expect(card.appointments).toHaveLength(0);
      expect(card.shouldShow).toBe(false);
      expect(card.expiredCount).toBe(2);
    });

    it('should show correct expiry time for barber awareness', () => {
      const createdAt = new Date('2025-07-04T10:00:00.000Z');
      const appointment: PendingAppointment = {
        id: 1,
        userId: 3,
        clientId: 31,
        scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
        status: 'pending',
        duration: 20,
        createdAt: createdAt,
        expiresAt: calculateExpiryTime(createdAt)
      };

      const expiryTimeFormatted = appointment.expiresAt.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      expect(expiryTimeFormatted).toBe('10:30 AM');
    });
  });

  describe('Real-World Scenario - Jake Boo Boo Appointment', () => {
    it('should handle the specific jake boo boo expired appointment case', () => {
      // Real appointment data from the system
      const jakePendingAppointment: PendingAppointment = {
        id: 70,
        userId: 3,
        clientId: 31,
        scheduledAt: new Date('2025-07-04T02:00:00.000Z'), // 2 AM UTC (was 2 hours ago)
        status: 'pending',
        duration: 20,
        createdAt: new Date('2025-07-04T01:48:00.348Z'), // Created at 1:48 AM
        expiresAt: calculateExpiryTime(new Date('2025-07-04T01:48:00.348Z')) // Should expire at 2:18 AM
      };

      const now = getCurrentTime(); // 10:30 AM UTC
      
      // Should be expired since 2:18 AM was over 8 hours ago
      expect(isAppointmentExpired(jakePendingAppointment)).toBe(true);
      
      const card = getPendingConfirmationsCard([jakePendingAppointment]);
      expect(card.shouldShow).toBe(false);
      expect(card.appointments).toHaveLength(0);
      expect(card.expiredCount).toBe(1);
    });
  });

  describe('Cleanup and Auto-Removal Logic', () => {
    it('should identify expired appointments for cleanup', () => {
      const appointments: PendingAppointment[] = [
        // Active appointment
        {
          id: 1,
          userId: 3,
          clientId: 31,
          scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
          status: 'pending',
          duration: 20,
          createdAt: new Date('2025-07-04T10:15:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T10:15:00.000Z'))
        },
        // Expired appointment
        {
          id: 2,
          userId: 3,
          clientId: 32,
          scheduledAt: new Date('2025-07-04T11:30:00.000Z'),
          status: 'pending',
          duration: 30,
          createdAt: new Date('2025-07-04T09:55:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T09:55:00.000Z'))
        }
      ];

      const expiredAppointments = getExpiredAppointments(appointments);
      
      expect(expiredAppointments).toHaveLength(1);
      expect(expiredAppointments[0].id).toBe(2);
    });

    it('should handle automatic cleanup returning count of expired appointments', () => {
      const appointments: PendingAppointment[] = [
        {
          id: 1,
          userId: 3,
          clientId: 31,
          scheduledAt: new Date('2025-07-04T11:00:00.000Z'),
          status: 'pending',
          duration: 20,
          createdAt: new Date('2025-07-04T09:55:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T09:55:00.000Z'))
        },
        {
          id: 2,
          userId: 3,
          clientId: 32,
          scheduledAt: new Date('2025-07-04T11:30:00.000Z'),
          status: 'pending',
          duration: 30,
          createdAt: new Date('2025-07-04T09:50:00.000Z'),
          expiresAt: calculateExpiryTime(new Date('2025-07-04T09:50:00.000Z'))
        }
      ];

      const expiredCount = getExpiredAppointments(appointments).length;
      
      expect(expiredCount).toBe(2);
    });
  });
});