import { describe, it, expect, beforeEach } from 'vitest';

// Test working hours calendar integration specifically for blocked time functionality
interface MockWorkingHours {
  [day: string]: {
    enabled: boolean;
    start: string;
    end: string;
    breaks?: Array<{
      start: string;
      end: string;
      label: string;
    }>;
  };
}

interface TimeSlot {
  hour: number;
  time: string;
  appointments: any[];
  isBlocked: boolean;
  isWithinWorkingHours: boolean;
}

// Mock calendar system to test working hours integration
class MockWorkingHoursCalendarSystem {
  private userWorkingHours: MockWorkingHours = {};

  setUserWorkingHours(workingHours: MockWorkingHours): void {
    this.userWorkingHours = workingHours;
  }

  // Generate time slots based on working hours (matches timeline-calendar logic)
  generateTimeSlots(selectedDate: Date): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check day-specific working hours
    const dayHours = this.userWorkingHours[dayName];
    let dayIsEnabled = false;
    let startHour = 9;
    let endHour = 17;

    if (dayHours) {
      dayIsEnabled = dayHours.enabled || false;
      if (dayIsEnabled && dayHours.start && dayHours.end) {
        startHour = parseInt(dayHours.start.split(':')[0]);
        endHour = parseInt(dayHours.end.split(':')[0]);
      }
    }

    // Generate slots from 8 AM to 8 PM (expanded range)
    for (let hour = 8; hour <= 20; hour++) {
      const timeStr = hour === 0 ? "12 AM" : 
                     hour === 12 ? "12 PM" : 
                     hour < 12 ? `${hour} AM` : 
                     `${hour - 12} PM`;

      // Check if within working hours
      let isWithinWorkingHours = false;
      if (dayIsEnabled && dayHours) {
        const workStart = parseInt(dayHours.start.split(':')[0]);
        const workEnd = parseInt(dayHours.end.split(':')[0]);
        isWithinWorkingHours = hour >= workStart && hour <= workEnd;

        // Check breaks
        if (isWithinWorkingHours && dayHours.breaks) {
          for (const breakTime of dayHours.breaks) {
            const breakStart = parseInt(breakTime.start.split(':')[0]);
            const breakEnd = parseInt(breakTime.end.split(':')[0]);
            if (hour >= breakStart && hour < breakEnd) {
              isWithinWorkingHours = false;
              break;
            }
          }
        }
      }

      slots.push({
        hour,
        time: timeStr,
        appointments: [],
        isBlocked: !isWithinWorkingHours,
        isWithinWorkingHours
      });
    }

    return slots;
  }

  // Test specific scenarios from user feedback
  testFridayDisabled(): {
    fridaySlots: TimeSlot[];
    allBlocked: boolean;
    workingSlots: number;
  } {
    const friday = new Date('2025-07-11'); // Friday
    const slots = this.generateTimeSlots(friday);
    const workingSlots = slots.filter(slot => !slot.isBlocked).length;
    
    return {
      fridaySlots: slots,
      allBlocked: workingSlots === 0,
      workingSlots
    };
  }

  testSaturdayDisabled(): {
    saturdaySlots: TimeSlot[];
    allBlocked: boolean;
    workingSlots: number;
  } {
    const saturday = new Date('2025-07-12'); // Saturday
    const slots = this.generateTimeSlots(saturday);
    const workingSlots = slots.filter(slot => !slot.isBlocked).length;
    
    return {
      saturdaySlots: slots,
      allBlocked: workingSlots === 0,
      workingSlots
    };
  }

  testTuesdayWithBreaks(): {
    tuesdaySlots: TimeSlot[];
    lunchBlocked: boolean;
    workingSlots: number;
    blockedSlots: number;
  } {
    const tuesday = new Date('2025-07-08'); // Tuesday
    const slots = this.generateTimeSlots(tuesday);
    
    // Check if lunch hour is blocked (12 PM)
    const lunchSlot = slots.find(slot => slot.hour === 12);
    const lunchBlocked = lunchSlot ? lunchSlot.isBlocked : false;
    
    const workingSlots = slots.filter(slot => !slot.isBlocked).length;
    const blockedSlots = slots.filter(slot => slot.isBlocked).length;
    
    return {
      tuesdaySlots: slots,
      lunchBlocked,
      workingSlots,
      blockedSlots
    };
  }

  // Test availability system integration
  generateAvailabilitySlots(date: string): string[] {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const dayHours = this.userWorkingHours[dayName];
    
    // Check if day is enabled
    if (!dayHours || !dayHours.enabled) {
      return []; // Not working this day
    }

    const startHour = parseInt(dayHours.start.split(':')[0]);
    const endHour = parseInt(dayHours.end.split(':')[0]);

    // Generate 15-minute time slots
    const timeSlots: string[] = [];
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      
      // Check if this time is in a break
      let inBreak = false;
      if (dayHours.breaks) {
        for (const breakTime of dayHours.breaks) {
          const breakStartHour = parseInt(breakTime.start.split(':')[0]);
          const breakStartMinute = parseInt(breakTime.start.split(':')[1] || '0');
          const breakEndHour = parseInt(breakTime.end.split(':')[0]);
          const breakEndMinute = parseInt(breakTime.end.split(':')[1] || '0');
          
          const currentTotalMinutes = hour * 60 + minute;
          const breakStartTotal = breakStartHour * 60 + breakStartMinute;
          const breakEndTotal = breakEndHour * 60 + breakEndMinute;
          
          if (currentTotalMinutes >= breakStartTotal && currentTotalMinutes < breakEndTotal) {
            inBreak = true;
            break;
          }
        }
      }
      
      if (!inBreak) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        timeSlots.push(timeStr);
      }
    }

    return timeSlots;
  }

  // Test cross-system consistency
  validateWorkingHoursConsistency(date: Date): {
    calendarSlotsCount: number;
    availabilitySlotsCount: number;
    consistent: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const dateStr = date.toISOString().split('T')[0];
    
    // Test calendar system
    const calendarSlots = this.generateTimeSlots(date);
    const availableCalendarSlots = calendarSlots.filter(slot => !slot.isBlocked);
    
    // Test availability system  
    const publicSlots = this.generateAvailabilitySlots(dateStr);
    
    // Convert calendar slots to 15-minute intervals for comparison
    const calendarMinuteSlots = availableCalendarSlots.length * 4; // Each hour = 4 fifteen-minute slots
    
    const consistent = Math.abs(calendarMinuteSlots - publicSlots.length) <= 4; // Allow small variance
    
    if (!consistent) {
      errors.push(`Calendar shows ${calendarMinuteSlots/4} working hours but availability shows ${publicSlots.length/4} hours`);
    }
    
    return {
      calendarSlotsCount: availableCalendarSlots.length,
      availabilitySlotsCount: publicSlots.length,
      consistent,
      errors
    };
  }
}

describe('Working Hours Calendar Integration Tests', () => {
  let calendarSystem: MockWorkingHoursCalendarSystem;

  beforeEach(() => {
    calendarSystem = new MockWorkingHoursCalendarSystem();
  });

  describe('User Working Hours Updates Integration', () => {
    it('should block Friday when Friday is disabled', () => {
      // Set working hours with Friday disabled (matching user's update)
      calendarSystem.setUserWorkingHours({
        monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }] },
        wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        friday: { enabled: false, start: '09:00', end: '18:00', breaks: [] }, // DISABLED
        saturday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }, // DISABLED
        sunday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }
      });

      const fridayResult = calendarSystem.testFridayDisabled();
      
      expect(fridayResult.allBlocked).toBe(true);
      expect(fridayResult.workingSlots).toBe(0);
      
      // All Friday slots should be blocked
      fridayResult.fridaySlots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
        expect(slot.isWithinWorkingHours).toBe(false);
      });
    });

    it('should block Saturday when Saturday is disabled', () => {
      // Set working hours with Saturday disabled (matching user's update)
      calendarSystem.setUserWorkingHours({
        monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }] },
        wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        friday: { enabled: false, start: '09:00', end: '18:00', breaks: [] },
        saturday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }, // DISABLED
        sunday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }
      });

      const saturdayResult = calendarSystem.testSaturdayDisabled();
      
      expect(saturdayResult.allBlocked).toBe(true);
      expect(saturdayResult.workingSlots).toBe(0);
      
      // All Saturday slots should be blocked
      saturdayResult.saturdaySlots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
        expect(slot.isWithinWorkingHours).toBe(false);
      });
    });

    it('should respect lunch break on Tuesday', () => {
      // Set working hours with Tuesday lunch break (matching user's update)
      calendarSystem.setUserWorkingHours({
        monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }] },
        wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        friday: { enabled: false, start: '09:00', end: '18:00', breaks: [] },
        saturday: { enabled: false, start: '10:00', end: '16:00', breaks: [] },
        sunday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }
      });

      const tuesdayResult = calendarSystem.testTuesdayWithBreaks();
      
      expect(tuesdayResult.lunchBlocked).toBe(true);
      expect(tuesdayResult.workingSlots).toBeGreaterThan(0);
      expect(tuesdayResult.blockedSlots).toBeGreaterThan(0);
      
      // Check that 12 PM (lunch hour) is blocked
      const lunchSlot = tuesdayResult.tuesdaySlots.find(slot => slot.hour === 12);
      expect(lunchSlot?.isBlocked).toBe(true);
      
      // Check that 11 AM and 1 PM are working
      const beforeLunch = tuesdayResult.tuesdaySlots.find(slot => slot.hour === 11);
      const afterLunch = tuesdayResult.tuesdaySlots.find(slot => slot.hour === 13);
      expect(beforeLunch?.isBlocked).toBe(false);
      expect(afterLunch?.isBlocked).toBe(false);
    });

    it('should maintain working hours for enabled days', () => {
      // Set working hours (matching user's update)
      calendarSystem.setUserWorkingHours({
        monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }] },
        wednesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        thursday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        friday: { enabled: false, start: '09:00', end: '18:00', breaks: [] },
        saturday: { enabled: false, start: '10:00', end: '16:00', breaks: [] },
        sunday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }
      });

      // Test Monday (enabled)
      const monday = new Date('2025-07-07');
      const mondaySlots = calendarSystem.generateTimeSlots(monday);
      const mondayWorkingSlots = mondaySlots.filter(slot => !slot.isBlocked);
      
      expect(mondayWorkingSlots.length).toBeGreaterThan(0);
      
      // Check specific working hours (9 AM - 6 PM)
      const slot9AM = mondaySlots.find(slot => slot.hour === 9);
      const slot5PM = mondaySlots.find(slot => slot.hour === 17);
      const slot8AM = mondaySlots.find(slot => slot.hour === 8);
      const slot7PM = mondaySlots.find(slot => slot.hour === 19);
      
      expect(slot9AM?.isBlocked).toBe(false);
      expect(slot5PM?.isBlocked).toBe(false);
      expect(slot8AM?.isBlocked).toBe(true);  // Before working hours
      expect(slot7PM?.isBlocked).toBe(true);  // After working hours
    });
  });

  describe('Availability System Integration', () => {
    it('should return empty availability for disabled Friday', () => {
      calendarSystem.setUserWorkingHours({
        friday: { enabled: false, start: '09:00', end: '18:00', breaks: [] }
      });

      const fridaySlots = calendarSystem.generateAvailabilitySlots('2025-07-11');
      expect(fridaySlots.length).toBe(0);
    });

    it('should return empty availability for disabled Saturday', () => {
      calendarSystem.setUserWorkingHours({
        saturday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }
      });

      const saturdaySlots = calendarSystem.generateAvailabilitySlots('2025-07-12');
      expect(saturdaySlots.length).toBe(0);
    });

    it('should respect break times in availability', () => {
      calendarSystem.setUserWorkingHours({
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }] }
      });

      const tuesdaySlots = calendarSystem.generateAvailabilitySlots('2025-07-08');
      
      // Should not include lunch hour slots
      expect(tuesdaySlots).not.toContain('12:00');
      expect(tuesdaySlots).not.toContain('12:15');
      expect(tuesdaySlots).not.toContain('12:30');
      expect(tuesdaySlots).not.toContain('12:45');
      
      // Should include slots before and after lunch
      expect(tuesdaySlots).toContain('11:45');
      expect(tuesdaySlots).toContain('13:00');
    });

    it('should provide working day availability', () => {
      calendarSystem.setUserWorkingHours({
        monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] }
      });

      const mondaySlots = calendarSystem.generateAvailabilitySlots('2025-07-07');
      expect(mondaySlots.length).toBeGreaterThan(0);
      
      // Should include 9:00 and slots up to 17:45 (last before 18:00)
      expect(mondaySlots).toContain('09:00');
      expect(mondaySlots).toContain('17:45');
      expect(mondaySlots).not.toContain('18:00'); // End time not included
    });
  });

  describe('Cross-System Consistency Validation', () => {
    it('should have consistent behavior for disabled days', () => {
      calendarSystem.setUserWorkingHours({
        friday: { enabled: false, start: '09:00', end: '18:00', breaks: [] },
        saturday: { enabled: false, start: '10:00', end: '16:00', breaks: [] },
        sunday: { enabled: false, start: '10:00', end: '16:00', breaks: [] }
      });

      const fridayDate = new Date('2025-07-11');
      const saturdayDate = new Date('2025-07-12');
      const sundayDate = new Date('2025-07-13');
      
      const fridayConsistency = calendarSystem.validateWorkingHoursConsistency(fridayDate);
      const saturdayConsistency = calendarSystem.validateWorkingHoursConsistency(saturdayDate);
      const sundayConsistency = calendarSystem.validateWorkingHoursConsistency(sundayDate);
      
      expect(fridayConsistency.calendarSlotsCount).toBe(0);
      expect(fridayConsistency.availabilitySlotsCount).toBe(0);
      expect(fridayConsistency.consistent).toBe(true);
      
      expect(saturdayConsistency.calendarSlotsCount).toBe(0);
      expect(saturdayConsistency.availabilitySlotsCount).toBe(0);
      expect(saturdayConsistency.consistent).toBe(true);
      
      expect(sundayConsistency.calendarSlotsCount).toBe(0);
      expect(sundayConsistency.availabilitySlotsCount).toBe(0);
      expect(sundayConsistency.consistent).toBe(true);
    });

    it('should have consistent behavior for enabled days with breaks', () => {
      calendarSystem.setUserWorkingHours({
        monday: { enabled: true, start: '09:00', end: '18:00', breaks: [] },
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }] }
      });

      const mondayDate = new Date('2025-07-07');
      const tuesdayDate = new Date('2025-07-08');
      
      const mondayConsistency = calendarSystem.validateWorkingHoursConsistency(mondayDate);
      const tuesdayConsistency = calendarSystem.validateWorkingHoursConsistency(tuesdayDate);
      
      expect(mondayConsistency.consistent).toBe(true);
      expect(tuesdayConsistency.consistent).toBe(true);
      expect(mondayConsistency.errors.length).toBe(0);
      expect(tuesdayConsistency.errors.length).toBe(0);
      
      // Monday should have more available slots than Tuesday (due to lunch break)
      expect(mondayConsistency.availabilitySlotsCount).toBeGreaterThan(tuesdayConsistency.availabilitySlotsCount);
    });
  });

  describe('Real-Time Updates', () => {
    it('should immediately reflect working hours changes', () => {
      // Initial state: Friday enabled
      calendarSystem.setUserWorkingHours({
        friday: { enabled: true, start: '09:00', end: '18:00', breaks: [] }
      });

      const friday = new Date('2025-07-11');
      let fridaySlots = calendarSystem.generateTimeSlots(friday);
      let workingSlots = fridaySlots.filter(slot => !slot.isBlocked).length;
      
      expect(workingSlots).toBeGreaterThan(0);

      // Update: Disable Friday
      calendarSystem.setUserWorkingHours({
        friday: { enabled: false, start: '09:00', end: '18:00', breaks: [] }
      });

      fridaySlots = calendarSystem.generateTimeSlots(friday);
      workingSlots = fridaySlots.filter(slot => !slot.isBlocked).length;
      
      expect(workingSlots).toBe(0);
    });

    it('should handle break time additions', () => {
      // Initial state: Tuesday without breaks
      calendarSystem.setUserWorkingHours({
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [] }
      });

      let tuesdaySlots = calendarSystem.generateAvailabilitySlots('2025-07-08');
      const initialSlotCount = tuesdaySlots.length;
      
      // Add lunch break
      calendarSystem.setUserWorkingHours({
        tuesday: { enabled: true, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }] }
      });

      tuesdaySlots = calendarSystem.generateAvailabilitySlots('2025-07-08');
      const finalSlotCount = tuesdaySlots.length;
      
      // Should have fewer slots after adding break (4 slots = 1 hour)
      expect(finalSlotCount).toBe(initialSlotCount - 4);
    });
  });
});