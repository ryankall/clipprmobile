import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock data structures for pending appointment slot locking tests
interface PendingAppointment {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  duration: number; // in minutes
  createdAt: Date;
  expiresAt: Date;
}

interface TimeSlot {
  time: string; // HH:MM format
  available: boolean;
}

interface TravelBuffer {
  preTravel: number; // minutes before appointment
  postTravel: number; // minutes after appointment
}

// Advanced slot locking utility functions
function calculateAppointmentEndTime(appointment: PendingAppointment): Date {
  return new Date(appointment.scheduledAt.getTime() + appointment.duration * 60 * 1000);
}

function calculateAppointmentTimeBlock(
  appointment: PendingAppointment, 
  travelBuffer: TravelBuffer = { preTravel: 15, postTravel: 15 }
): { start: Date; end: Date } {
  const appointmentStart = new Date(appointment.scheduledAt);
  const appointmentEnd = calculateAppointmentEndTime(appointment);
  
  return {
    start: new Date(appointmentStart.getTime() - travelBuffer.preTravel * 60 * 1000),
    end: new Date(appointmentEnd.getTime() + travelBuffer.postTravel * 60 * 1000)
  };
}

function generateTimeSlots(date: Date, startHour: number = 9, endHour: number = 18): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({
        time: timeString,
        available: true
      });
    }
  }
  
  return slots;
}

function checkSlotOverlap(slotTime: string, slotDate: Date, appointment: PendingAppointment, travelBuffer?: TravelBuffer): boolean {
  const [hour, minute] = slotTime.split(':').map(Number);
  const slotStart = new Date(slotDate);
  slotStart.setHours(hour, minute, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 15 * 60 * 1000); // 15-minute slot
  
  const appointmentBlock = calculateAppointmentTimeBlock(appointment, travelBuffer);
  
  // Check for overlap: slot and appointment block overlap if:
  // - appointment block starts before slot ends AND
  // - appointment block ends after slot starts
  return appointmentBlock.start < slotEnd && appointmentBlock.end > slotStart;
}

function applyPendingAppointmentBlocking(
  timeSlots: TimeSlot[], 
  date: Date, 
  pendingAppointments: PendingAppointment[],
  travelBuffer?: TravelBuffer
): TimeSlot[] {
  return timeSlots.map(slot => {
    const isBlocked = pendingAppointments.some(appointment => {
      // Only block for pending and confirmed appointments
      if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
        return false;
      }
      
      // Check if appointment has expired (for pending appointments)
      if (appointment.status === 'pending' && new Date() > appointment.expiresAt) {
        return false;
      }
      
      return checkSlotOverlap(slot.time, date, appointment, travelBuffer);
    });
    
    return {
      ...slot,
      available: slot.available && !isBlocked
    };
  });
}

function isAppointmentExpired(appointment: PendingAppointment): boolean {
  if (appointment.status !== 'pending') {
    return false;
  }
  
  return new Date() > appointment.expiresAt;
}

function calculateExpiryTime(createdAt: Date, expiryMinutes: number = 30): Date {
  return new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
}

// Test Suite: Advanced Pending Slot Locking
describe('Advanced Pending Appointment Slot Locking', () => {
  
  describe('Critical Slot Locking Bug Fix', () => {
    it('should block 1:00pm time slot for jake boo boo pending appointment', () => {
      // Real scenario: jake boo boo appointment at 1:00 PM UTC with 95-minute duration
      const jakePendingAppointment: PendingAppointment = {
        id: 65,
        userId: 3,
        clientId: 31,
        scheduledAt: new Date('2025-07-03T13:00:00.000Z'), // 1:00 PM UTC
        status: 'pending',
        duration: 95, // 95 minutes (1 hour 35 minutes)
        createdAt: new Date('2025-07-03T10:58:02.871Z'),
        expiresAt: new Date('2025-07-03T11:28:02.871Z') // 30 minutes after creation
      };
      
      const testDate = new Date('2025-07-03');
      const timeSlots = generateTimeSlots(testDate);
      
      // Apply blocking logic
      const blockedSlots = applyPendingAppointmentBlocking(
        timeSlots, 
        testDate, 
        [jakePendingAppointment],
        { preTravel: 15, postTravel: 15 }
      );
      
      // Check that 1:00 PM slot is blocked (appointment starts at 1:00 PM UTC)
      const onePmSlot = blockedSlots.find(slot => slot.time === '13:00');
      expect(onePmSlot).toBeDefined();
      expect(onePmSlot?.available).toBe(false);
      
      // Check that slots during the appointment duration are also blocked
      const twoPmSlot = blockedSlots.find(slot => slot.time === '14:00');
      const twoThirtySlot = blockedSlots.find(slot => slot.time === '14:30');
      
      expect(twoPmSlot?.available).toBe(false);
      expect(twoThirtySlot?.available).toBe(false);
      
      // Check that slots after appointment + travel buffer are available
      // Appointment: 1:00 PM - 2:35 PM (95 minutes) + 15 min buffer = 2:50 PM
      const threePmSlot = blockedSlots.find(slot => slot.time === '15:00');
      expect(threePmSlot?.available).toBe(true);
    });
    
    it('should calculate correct appointment time block with travel buffers', () => {
      const appointment: PendingAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-03T14:00:00.000Z'), // 2:00 PM
        status: 'pending',
        duration: 60,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
      const timeBlock = calculateAppointmentTimeBlock(appointment, { preTravel: 20, postTravel: 25 });
      
      // Should start 20 minutes before appointment
      expect(timeBlock.start).toEqual(new Date('2025-07-03T13:40:00.000Z'));
      
      // Should end 25 minutes after appointment ends (appointment duration + post-travel)
      expect(timeBlock.end).toEqual(new Date('2025-07-03T15:25:00.000Z'));
    });
    
    it('should handle appointments that span multiple hours with proper blocking', () => {
      const longAppointment: PendingAppointment = {
        id: 2,
        userId: 1,
        clientId: 2,
        scheduledAt: new Date('2025-07-03T13:00:00.000Z'), // 1:00 PM
        status: 'pending',
        duration: 120, // 2 hours
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
      const testDate = new Date('2025-07-03');
      const timeSlots = generateTimeSlots(testDate);
      const blockedSlots = applyPendingAppointmentBlocking(timeSlots, testDate, [longAppointment]);
      
      // Should block slots from 12:45 PM (15 min before) to 3:15 PM (15 min after)
      const twelveFortyFiveSlot = blockedSlots.find(slot => slot.time === '12:45');
      const oneOclockSlot = blockedSlots.find(slot => slot.time === '13:00');
      const twoOclockSlot = blockedSlots.find(slot => slot.time === '14:00');
      const threeOclockSlot = blockedSlots.find(slot => slot.time === '15:00');
      const threeFifteenSlot = blockedSlots.find(slot => slot.time === '15:15');
      
      expect(twelveFortyFiveSlot?.available).toBe(false);
      expect(oneOclockSlot?.available).toBe(false);
      expect(twoOclockSlot?.available).toBe(false);
      expect(threeOclockSlot?.available).toBe(false);
      expect(threeFifteenSlot?.available).toBe(true); // After buffer period
    });
  });
  
  describe('30-Minute Appointment Expiry System', () => {
    beforeEach(() => {
      // Reset time to fixed point for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-07-03T15:00:00.000Z'));
    });
    
    it('should expire pending appointments after 30 minutes', () => {
      const now = new Date('2025-07-03T15:00:00.000Z');
      
      // Create appointment that was created 35 minutes ago (should be expired)
      const expiredAppointment: PendingAppointment = {
        id: 3,
        userId: 1,
        clientId: 3,
        scheduledAt: new Date('2025-07-03T16:00:00.000Z'),
        status: 'pending',
        duration: 60,
        createdAt: new Date('2025-07-03T14:20:00.000Z'), // 40 minutes ago
        expiresAt: calculateExpiryTime(new Date('2025-07-03T14:20:00.000Z'), 30)
      };
      
      // Create appointment that was created 20 minutes ago (should still be active)
      const activeAppointment: PendingAppointment = {
        id: 4,
        userId: 1,
        clientId: 4,
        scheduledAt: new Date('2025-07-03T16:30:00.000Z'),
        status: 'pending',
        duration: 60,
        createdAt: new Date('2025-07-03T14:40:00.000Z'), // 20 minutes ago
        expiresAt: calculateExpiryTime(new Date('2025-07-03T14:40:00.000Z'), 30)
      };
      
      expect(isAppointmentExpired(expiredAppointment)).toBe(true);
      expect(isAppointmentExpired(activeAppointment)).toBe(false);
    });
    
    it('should not block time slots for expired pending appointments', () => {
      const now = new Date('2025-07-03T15:00:00.000Z');
      
      const expiredAppointment: PendingAppointment = {
        id: 5,
        userId: 1,
        clientId: 5,
        scheduledAt: new Date('2025-07-03T14:00:00.000Z'), // 2:00 PM
        status: 'pending',
        duration: 60,
        createdAt: new Date('2025-07-03T13:00:00.000Z'), // Created 2 hours ago
        expiresAt: calculateExpiryTime(new Date('2025-07-03T13:00:00.000Z'), 30) // Expired 1.5 hours ago
      };
      
      const testDate = new Date('2025-07-03');
      const timeSlots = generateTimeSlots(testDate);
      const blockedSlots = applyPendingAppointmentBlocking(timeSlots, testDate, [expiredAppointment]);
      
      // The 2:00 PM slot should be available since the appointment has expired
      const twoOclockSlot = blockedSlots.find(slot => slot.time === '14:00');
      expect(twoOclockSlot?.available).toBe(true);
    });
    
    it('should calculate expiry time correctly', () => {
      const createdAt = new Date('2025-07-03T10:30:00.000Z');
      const expiryTime = calculateExpiryTime(createdAt, 30);
      
      const expectedExpiry = new Date('2025-07-03T11:00:00.000Z');
      expect(expiryTime).toEqual(expectedExpiry);
    });
    
    it('should handle custom expiry times', () => {
      const createdAt = new Date('2025-07-03T10:00:00.000Z');
      const expiryTime = calculateExpiryTime(createdAt, 45); // 45 minutes
      
      const expectedExpiry = new Date('2025-07-03T10:45:00.000Z');
      expect(expiryTime).toEqual(expectedExpiry);
    });
    
    it('should distinguish between different appointment statuses for expiry', () => {
      const now = new Date('2025-07-03T15:00:00.000Z');
      
      const confirmedOldAppointment: PendingAppointment = {
        id: 6,
        userId: 1,
        clientId: 6,
        scheduledAt: new Date('2025-07-03T16:00:00.000Z'),
        status: 'confirmed', // Confirmed appointments don't expire
        duration: 60,
        createdAt: new Date('2025-07-03T14:00:00.000Z'), // 1 hour ago
        expiresAt: calculateExpiryTime(new Date('2025-07-03T14:00:00.000Z'), 30)
      };
      
      expect(isAppointmentExpired(confirmedOldAppointment)).toBe(false);
    });
  });
  
  describe('Multiple Pending Appointments Interaction', () => {
    it('should handle multiple overlapping pending appointments correctly', () => {
      const appointment1: PendingAppointment = {
        id: 7,
        userId: 1,
        clientId: 7,
        scheduledAt: new Date('2025-07-03T13:00:00.000Z'), // 1:00 PM
        status: 'pending',
        duration: 60,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
      const appointment2: PendingAppointment = {
        id: 8,
        userId: 1,
        clientId: 8,
        scheduledAt: new Date('2025-07-03T13:30:00.000Z'), // 1:30 PM (overlaps with first)
        status: 'pending',
        duration: 60,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
      const testDate = new Date('2025-07-03');
      const timeSlots = generateTimeSlots(testDate);
      const blockedSlots = applyPendingAppointmentBlocking(timeSlots, testDate, [appointment1, appointment2]);
      
      // Both appointments should block time slots
      const oneOclockSlot = blockedSlots.find(slot => slot.time === '13:00');
      const oneThirtySlot = blockedSlots.find(slot => slot.time === '13:30');
      const twoOclockSlot = blockedSlots.find(slot => slot.time === '14:00');
      const twoThirtySlot = blockedSlots.find(slot => slot.time === '14:30');
      
      expect(oneOclockSlot?.available).toBe(false);
      expect(oneThirtySlot?.available).toBe(false);
      expect(twoOclockSlot?.available).toBe(false);
      expect(twoThirtySlot?.available).toBe(false);
    });
    
    it('should handle mix of expired and active pending appointments', () => {
      const now = new Date('2025-07-03T15:00:00.000Z');
      vi.setSystemTime(now);
      
      const expiredAppointment: PendingAppointment = {
        id: 9,
        userId: 1,
        clientId: 9,
        scheduledAt: new Date('2025-07-03T13:00:00.000Z'),
        status: 'pending',
        duration: 60,
        createdAt: new Date('2025-07-03T14:00:00.000Z'), // 1 hour ago
        expiresAt: calculateExpiryTime(new Date('2025-07-03T14:00:00.000Z'), 30)
      };
      
      const activeAppointment: PendingAppointment = {
        id: 10,
        userId: 1,
        clientId: 10,
        scheduledAt: new Date('2025-07-03T16:00:00.000Z'),
        status: 'pending',
        duration: 60,
        createdAt: new Date('2025-07-03T14:45:00.000Z'), // 15 minutes ago
        expiresAt: calculateExpiryTime(new Date('2025-07-03T14:45:00.000Z'), 30)
      };
      
      const testDate = new Date('2025-07-03');
      const timeSlots = generateTimeSlots(testDate);
      const blockedSlots = applyPendingAppointmentBlocking(timeSlots, testDate, [expiredAppointment, activeAppointment]);
      
      // Expired appointment slot should be available
      const oneOclockSlot = blockedSlots.find(slot => slot.time === '13:00');
      expect(oneOclockSlot?.available).toBe(true);
      
      // Active appointment slot should be blocked
      const fourOclockSlot = blockedSlots.find(slot => slot.time === '16:00');
      expect(fourOclockSlot?.available).toBe(false);
    });
  });
  
  describe('Travel Buffer Time Integration', () => {
    it('should include travel buffer time in slot blocking calculations', () => {
      const appointment: PendingAppointment = {
        id: 11,
        userId: 1,
        clientId: 11,
        scheduledAt: new Date('2025-07-03T14:00:00.000Z'), // 2:00 PM
        status: 'pending',
        duration: 60,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
      const testDate = new Date('2025-07-03');
      const timeSlots = generateTimeSlots(testDate);
      
      // Apply large travel buffers
      const blockedSlots = applyPendingAppointmentBlocking(
        timeSlots, 
        testDate, 
        [appointment],
        { preTravel: 30, postTravel: 45 } // 30 min before, 45 min after
      );
      
      // Should block from 1:30 PM (30 min before) to 3:45 PM (45 min after appointment end)
      const oneThirtySlot = blockedSlots.find(slot => slot.time === '13:30');
      const twoOclockSlot = blockedSlots.find(slot => slot.time === '14:00');
      const threeOclockSlot = blockedSlots.find(slot => slot.time === '15:00');
      const threeFortyFiveSlot = blockedSlots.find(slot => slot.time === '15:45');
      const fourOclockSlot = blockedSlots.find(slot => slot.time === '16:00');
      
      expect(oneThirtySlot?.available).toBe(false);
      expect(twoOclockSlot?.available).toBe(false);
      expect(threeOclockSlot?.available).toBe(false);
      expect(threeFortyFiveSlot?.available).toBe(true); // After buffer period
      expect(fourOclockSlot?.available).toBe(true);
    });
    
    it('should handle zero travel buffer times', () => {
      const appointment: PendingAppointment = {
        id: 12,
        userId: 1,
        clientId: 12,
        scheduledAt: new Date('2025-07-03T14:00:00.000Z'), // 2:00 PM
        status: 'pending',
        duration: 60,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
      
      const testDate = new Date('2025-07-03');
      const timeSlots = generateTimeSlots(testDate);
      
      // Apply zero travel buffers
      const blockedSlots = applyPendingAppointmentBlocking(
        timeSlots, 
        testDate, 
        [appointment],
        { preTravel: 0, postTravel: 0 }
      );
      
      // Should only block the exact appointment time (2:00-3:00 PM)
      const oneFortyFiveSlot = blockedSlots.find(slot => slot.time === '13:45');
      const twoOclockSlot = blockedSlots.find(slot => slot.time === '14:00');
      const threeOclockSlot = blockedSlots.find(slot => slot.time === '15:00');
      
      expect(oneFortyFiveSlot?.available).toBe(true); // Before appointment
      expect(twoOclockSlot?.available).toBe(false); // During appointment
      expect(threeOclockSlot?.available).toBe(true); // After appointment
    });
  });
});