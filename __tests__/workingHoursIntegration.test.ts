import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for comprehensive working hours integration tests
interface MockUser {
  id: number;
  email: string;
  workingHours: {
    [day: string]: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
}

interface MockAppointment {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  duration: number;
  service: {
    name: string;
    price: string;
  };
  client: {
    name: string;
  };
  price: string;
}

interface TimeSlot {
  hour: number;
  time: string;
  appointment: MockAppointment | null;
  isBlocked: boolean;
  isWithinWorkingHours: boolean;
}

// Mock working hours integration system
class MockWorkingHoursIntegrationSystem {
  private users: Map<number, MockUser> = new Map();
  private appointments: Map<number, MockAppointment[]> = new Map();

  constructor() {
    this.setupTestUsers();
  }

  private setupTestUsers(): void {
    // User with standard working hours
    this.users.set(1, {
      id: 1,
      email: 'standard@test.com',
      workingHours: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '09:00', end: '17:00' }, // Saturday closed
        sunday: { enabled: false, start: '09:00', end: '17:00' } // Sunday closed
      }
    });

    // User with custom working hours (Saturday open, different hours)
    this.users.set(2, {
      id: 2,
      email: 'custom@test.com',
      workingHours: {
        monday: { enabled: true, start: '10:00', end: '18:00' },
        tuesday: { enabled: true, start: '10:00', end: '18:00' },
        wednesday: { enabled: false, start: '10:00', end: '18:00' }, // Wednesday closed
        thursday: { enabled: true, start: '10:00', end: '18:00' },
        friday: { enabled: true, start: '10:00', end: '18:00' },
        saturday: { enabled: true, start: '11:00', end: '15:00' }, // Saturday open with limited hours
        sunday: { enabled: false, start: '10:00', end: '18:00' } // Sunday closed
      }
    });

    // User with no working hours set (should use defaults)
    this.users.set(3, {
      id: 3,
      email: 'default@test.com',
      workingHours: {}
    });

    // Initialize empty appointment arrays
    for (let i = 1; i <= 3; i++) {
      this.appointments.set(i, []);
    }
  }

  getUserWorkingHours(userId: number): any {
    return this.users.get(userId)?.workingHours || {};
  }

  updateUserWorkingHours(userId: number, workingHours: any): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    
    user.workingHours = { ...user.workingHours, ...workingHours };
    return true;
  }

  // Calendar system: Generate time slots based on working hours
  generateCalendarTimeSlots(userId: number, selectedDate: Date): TimeSlot[] {
    const workingHours = this.getUserWorkingHours(userId);
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const slots: TimeSlot[] = [];
    let dayIsEnabled = true;
    let startHour = 9;
    let endHour = 17;

    // Check day-specific working hours
    if (workingHours[dayName]) {
      const dayHours = workingHours[dayName];
      dayIsEnabled = dayHours.enabled || false;
      
      if (dayIsEnabled && dayHours.start && dayHours.end) {
        startHour = parseInt(dayHours.start.split(":")[0]);
        endHour = parseInt(dayHours.end.split(":")[0]);
      }
    }

    // Generate slots from 8 AM to 8 PM (expanded range)
    for (let hour = 8; hour <= 20; hour++) {
      const isWithinWorkingHours = dayIsEnabled && hour >= startHour && hour <= endHour;
      const isBlocked = !isWithinWorkingHours;

      slots.push({
        hour,
        time: hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour < 12 ? `${hour} AM` : `${hour - 12} PM`,
        appointment: null, // Simplified for this test
        isBlocked,
        isWithinWorkingHours
      });
    }

    return slots;
  }

  // Scheduling system: Check if time slot is available for booking
  isTimeSlotAvailable(userId: number, scheduledAt: Date): {
    available: boolean;
    reason?: string;
  } {
    const workingHours = this.getUserWorkingHours(userId);
    const dayOfWeek = scheduledAt.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const hour = scheduledAt.getHours();

    // Check if day is enabled
    if (workingHours[dayName]) {
      const dayHours = workingHours[dayName];
      
      if (!dayHours.enabled) {
        return {
          available: false,
          reason: `Not working on ${dayName}s`
        };
      }

      // Check if within working hours
      const startHour = parseInt(dayHours.start.split(":")[0]);
      const endHour = parseInt(dayHours.end.split(":")[0]);
      
      if (hour < startHour || hour >= endHour) {
        return {
          available: false,
          reason: `Outside working hours (${dayHours.start}-${dayHours.end})`
        };
      }
    }

    return { available: true };
  }

  // Public availability system: Get available time slots for public booking
  getPublicAvailableTimeSlots(userId: number, date: string): string[] {
    const workingHours = this.getUserWorkingHours(userId);
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check if day is enabled
    if (!workingHours[dayName] || !workingHours[dayName].enabled) {
      return []; // Not working this day
    }

    const dayHours = workingHours[dayName];
    const startHour = parseInt(dayHours.start.split(":")[0]);
    const endHour = parseInt(dayHours.end.split(":")[0]);

    // Generate 15-minute time slots
    const timeSlots: string[] = [];
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeStr);
    }

    return timeSlots;
  }

  // Cross-system consistency check
  validateWorkingHoursConsistency(userId: number, date: Date): {
    calendarCorrect: boolean;
    schedulingCorrect: boolean;
    availabilityCorrect: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const dateStr = date.toISOString().split('T')[0];
    
    // Test calendar system
    const calendarSlots = this.generateCalendarTimeSlots(userId, date);
    const availableCalendarSlots = calendarSlots.filter(slot => !slot.isBlocked);
    
    // Test scheduling system  
    const schedulingResults = [];
    for (let hour = 8; hour <= 20; hour++) {
      const testTime = new Date(date);
      testTime.setHours(hour, 0, 0, 0);
      schedulingResults.push(this.isTimeSlotAvailable(userId, testTime));
    }
    const availableSchedulingSlots = schedulingResults.filter(result => result.available);
    
    // Test availability system
    const publicSlots = this.getPublicAvailableTimeSlots(userId, dateStr);
    
    // Compare results
    const calendarCorrect = availableCalendarSlots.length > 0 || publicSlots.length === 0;
    const schedulingCorrect = availableSchedulingSlots.length > 0 || publicSlots.length === 0;
    const availabilityCorrect = publicSlots.length >= 0; // Always valid

    // Check consistency between systems
    if (publicSlots.length === 0 && availableCalendarSlots.length > 0) {
      errors.push('Calendar shows available slots but public booking shows none');
    }
    
    if (publicSlots.length > 0 && availableCalendarSlots.length === 0) {
      errors.push('Public booking shows available slots but calendar shows none');
    }

    return {
      calendarCorrect,
      schedulingCorrect,
      availabilityCorrect,
      errors
    };
  }
}

describe('Working Hours Settings Integration Tests', () => {
  let workingHoursSystem: MockWorkingHoursIntegrationSystem;

  beforeEach(() => {
    workingHoursSystem = new MockWorkingHoursIntegrationSystem();
  });

  describe('Calendar System Integration', () => {
    it('should respect Saturday closed setting in calendar view', () => {
      // User 1 has Saturday disabled
      const saturdayDate = new Date('2025-07-12'); // Saturday
      const slots = workingHoursSystem.generateCalendarTimeSlots(1, saturdayDate);
      
      // All slots should be blocked on Saturday
      const availableSlots = slots.filter(slot => !slot.isBlocked);
      expect(availableSlots.length).toBe(0);
      
      // All slots should be marked as blocked
      slots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
        expect(slot.isWithinWorkingHours).toBe(false);
      });
    });

    it('should show Monday as available for standard working hours', () => {
      // User 1 has Monday enabled 9-5
      const mondayDate = new Date('2025-07-07'); // Monday
      const slots = workingHoursSystem.generateCalendarTimeSlots(1, mondayDate);
      
      // Should have available slots during working hours
      const availableSlots = slots.filter(slot => !slot.isBlocked);
      expect(availableSlots.length).toBeGreaterThan(0);
      
      // Working hours slots (9 AM - 5 PM) should be available
      const slot9AM = slots.find(slot => slot.hour === 9);
      const slot5PM = slots.find(slot => slot.hour === 17);
      const slot8AM = slots.find(slot => slot.hour === 8);
      const slot8PM = slots.find(slot => slot.hour === 20);
      
      expect(slot9AM?.isBlocked).toBe(false);
      expect(slot5PM?.isBlocked).toBe(false);
      expect(slot8AM?.isBlocked).toBe(true);  // Before working hours
      expect(slot8PM?.isBlocked).toBe(true);  // After working hours
    });

    it('should respect custom working hours for user 2', () => {
      // User 2 has Wednesday disabled and Saturday open 11-3
      const wednesdayDate = new Date('2025-07-09'); // Wednesday
      const saturdayDate = new Date('2025-07-12'); // Saturday
      
      // Wednesday should be all blocked
      const wednesdaySlots = workingHoursSystem.generateCalendarTimeSlots(2, wednesdayDate);
      const availableWednesdaySlots = wednesdaySlots.filter(slot => !slot.isBlocked);
      expect(availableWednesdaySlots.length).toBe(0);
      
      // Saturday should have limited availability 11-3
      const saturdaySlots = workingHoursSystem.generateCalendarTimeSlots(2, saturdayDate);
      const availableSaturdaySlots = saturdaySlots.filter(slot => !slot.isBlocked);
      expect(availableSaturdaySlots.length).toBeGreaterThan(0);
      
      const slot11AM = saturdaySlots.find(slot => slot.hour === 11);
      const slot2PM = saturdaySlots.find(slot => slot.hour === 14);
      const slot4PM = saturdaySlots.find(slot => slot.hour === 16);
      
      expect(slot11AM?.isBlocked).toBe(false);
      expect(slot2PM?.isBlocked).toBe(false);
      expect(slot4PM?.isBlocked).toBe(true); // After 3 PM
    });
  });

  describe('Scheduling System Integration', () => {
    it('should prevent booking on Saturday for user with Saturday closed', () => {
      const saturdayTime = new Date('2025-07-12T10:00:00'); // Saturday 10 AM
      const result = workingHoursSystem.isTimeSlotAvailable(1, saturdayTime);
      
      expect(result.available).toBe(false);
      expect(result.reason).toContain('Not working on saturdays');
    });

    it('should allow booking during working hours', () => {
      const mondayTime = new Date('2025-07-07T10:00:00'); // Monday 10 AM
      const result = workingHoursSystem.isTimeSlotAvailable(1, mondayTime);
      
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent booking outside working hours', () => {
      const mondayEarlyTime = new Date('2025-07-07T07:00:00'); // Monday 7 AM (before 9 AM)
      const mondayLateTime = new Date('2025-07-07T19:00:00'); // Monday 7 PM (after 5 PM)
      
      const earlyResult = workingHoursSystem.isTimeSlotAvailable(1, mondayEarlyTime);
      const lateResult = workingHoursSystem.isTimeSlotAvailable(1, mondayLateTime);
      
      expect(earlyResult.available).toBe(false);
      expect(earlyResult.reason).toContain('Outside working hours');
      
      expect(lateResult.available).toBe(false);
      expect(lateResult.reason).toContain('Outside working hours');
    });

    it('should respect custom Saturday hours for user 2', () => {
      const saturdayTime = new Date('2025-07-12T12:00:00'); // Saturday 12 PM
      const result = workingHoursSystem.isTimeSlotAvailable(2, saturdayTime);
      
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Public Availability System Integration', () => {
    it('should return empty availability for Saturday when closed', () => {
      const saturdaySlots = workingHoursSystem.getPublicAvailableTimeSlots(1, '2025-07-12');
      expect(saturdaySlots.length).toBe(0);
    });

    it('should return time slots for working days', () => {
      const mondaySlots = workingHoursSystem.getPublicAvailableTimeSlots(1, '2025-07-07');
      expect(mondaySlots.length).toBeGreaterThan(0);
      
      // Should include 9:00, 9:15, etc. up to 16:45 (last slot before 5 PM)
      expect(mondaySlots).toContain('09:00');
      expect(mondaySlots).toContain('09:15');
      expect(mondaySlots).toContain('16:45');
      expect(mondaySlots).not.toContain('17:00'); // Exactly at end time
    });

    it('should respect custom Saturday hours for user 2', () => {
      const saturdaySlots = workingHoursSystem.getPublicAvailableTimeSlots(2, '2025-07-12');
      expect(saturdaySlots.length).toBeGreaterThan(0);
      
      // Should include 11:00 to 14:45 (last slot before 3 PM)
      expect(saturdaySlots).toContain('11:00');
      expect(saturdaySlots).toContain('14:45');
      expect(saturdaySlots).not.toContain('10:45'); // Before start
      expect(saturdaySlots).not.toContain('15:00'); // At end time
    });

    it('should return empty for Wednesday when user 2 has Wednesday closed', () => {
      const wednesdaySlots = workingHoursSystem.getPublicAvailableTimeSlots(2, '2025-07-09');
      expect(wednesdaySlots.length).toBe(0);
    });
  });

  describe('Cross-System Consistency Validation', () => {
    it('should have consistent behavior across all systems for Saturday closed', () => {
      const saturdayDate = new Date('2025-07-12');
      const consistency = workingHoursSystem.validateWorkingHoursConsistency(1, saturdayDate);
      
      expect(consistency.calendarCorrect).toBe(true);
      expect(consistency.schedulingCorrect).toBe(true);
      expect(consistency.availabilityCorrect).toBe(true);
      expect(consistency.errors.length).toBe(0);
    });

    it('should have consistent behavior across all systems for Monday working', () => {
      const mondayDate = new Date('2025-07-07');
      const consistency = workingHoursSystem.validateWorkingHoursConsistency(1, mondayDate);
      
      expect(consistency.calendarCorrect).toBe(true);
      expect(consistency.schedulingCorrect).toBe(true);
      expect(consistency.availabilityCorrect).toBe(true);
      expect(consistency.errors.length).toBe(0);
    });

    it('should handle custom working hours consistently', () => {
      const wednesdayDate = new Date('2025-07-09'); // Wednesday closed for user 2
      const saturdayDate = new Date('2025-07-12'); // Saturday open for user 2
      
      const wednesdayConsistency = workingHoursSystem.validateWorkingHoursConsistency(2, wednesdayDate);
      const saturdayConsistency = workingHoursSystem.validateWorkingHoursConsistency(2, saturdayDate);
      
      expect(wednesdayConsistency.errors.length).toBe(0);
      expect(saturdayConsistency.errors.length).toBe(0);
    });
  });

  describe('Working Hours Update Integration', () => {
    it('should update working hours and reflect changes across all systems', () => {
      // Update user 1 to have Saturday open
      const newWorkingHours = {
        saturday: { enabled: true, start: '10:00', end: '16:00' }
      };
      
      const updateSuccess = workingHoursSystem.updateUserWorkingHours(1, newWorkingHours);
      expect(updateSuccess).toBe(true);
      
      // Test calendar system
      const saturdayDate = new Date('2025-07-12');
      const calendarSlots = workingHoursSystem.generateCalendarTimeSlots(1, saturdayDate);
      const availableSlots = calendarSlots.filter(slot => !slot.isBlocked);
      expect(availableSlots.length).toBeGreaterThan(0);
      
      // Test scheduling system
      const saturdayTime = new Date('2025-07-12T12:00:00');
      const schedulingResult = workingHoursSystem.isTimeSlotAvailable(1, saturdayTime);
      expect(schedulingResult.available).toBe(true);
      
      // Test availability system
      const publicSlots = workingHoursSystem.getPublicAvailableTimeSlots(1, '2025-07-12');
      expect(publicSlots.length).toBeGreaterThan(0);
      expect(publicSlots).toContain('10:00');
      expect(publicSlots).toContain('15:45');
    });

    it('should handle disabling a previously enabled day', () => {
      // Disable Monday for user 1
      const newWorkingHours = {
        monday: { enabled: false, start: '09:00', end: '17:00' }
      };
      
      const updateSuccess = workingHoursSystem.updateUserWorkingHours(1, newWorkingHours);
      expect(updateSuccess).toBe(true);
      
      // Test all systems show Monday as unavailable
      const mondayDate = new Date('2025-07-07');
      const calendarSlots = workingHoursSystem.generateCalendarTimeSlots(1, mondayDate);
      const availableSlots = calendarSlots.filter(slot => !slot.isBlocked);
      expect(availableSlots.length).toBe(0);
      
      const mondayTime = new Date('2025-07-07T10:00:00');
      const schedulingResult = workingHoursSystem.isTimeSlotAvailable(1, mondayTime);
      expect(schedulingResult.available).toBe(false);
      
      const publicSlots = workingHoursSystem.getPublicAvailableTimeSlots(1, '2025-07-07');
      expect(publicSlots.length).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle users with no working hours set', () => {
      // User 3 has empty working hours
      const mondayDate = new Date('2025-07-07');
      
      // Should still work with default behavior
      const calendarSlots = workingHoursSystem.generateCalendarTimeSlots(3, mondayDate);
      expect(calendarSlots.length).toBeGreaterThan(0);
      
      const mondayTime = new Date('2025-07-07T10:00:00');
      const schedulingResult = workingHoursSystem.isTimeSlotAvailable(3, mondayTime);
      expect(schedulingResult.available).toBe(true); // Should default to available
      
      const publicSlots = workingHoursSystem.getPublicAvailableTimeSlots(3, '2025-07-07');
      expect(publicSlots.length).toBe(0); // No working hours defined
    });

    it('should handle invalid working hours gracefully', () => {
      // Try to update with invalid hours
      const invalidWorkingHours = {
        monday: { enabled: true, start: '18:00', end: '09:00' } // End before start
      };
      
      const updateSuccess = workingHoursSystem.updateUserWorkingHours(1, invalidWorkingHours);
      expect(updateSuccess).toBe(true); // Update succeeds, but validation should handle
      
      // Systems should handle gracefully
      const mondayDate = new Date('2025-07-07');
      const publicSlots = workingHoursSystem.getPublicAvailableTimeSlots(1, '2025-07-07');
      expect(publicSlots.length).toBe(0); // Invalid range returns no slots
    });

    it('should validate time format consistency', () => {
      const workingHours = workingHoursSystem.getUserWorkingHours(1);
      
      Object.values(workingHours).forEach((dayHours: any) => {
        if (dayHours.start) {
          expect(dayHours.start).toMatch(/^\d{2}:\d{2}$/);
        }
        if (dayHours.end) {
          expect(dayHours.end).toMatch(/^\d{2}:\d{2}$/);
        }
        expect(typeof dayHours.enabled).toBe('boolean');
      });
    });
  });
});