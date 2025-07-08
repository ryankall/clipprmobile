import { describe, it, expect, beforeEach } from 'vitest';

// Test break label functionality in timeline calendar
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
  breakLabel?: string | null;
}

// Mock timeline calendar system that handles break labels
class MockTimelineCalendarWithLabels {
  private userWorkingHours: MockWorkingHours = {};

  setWorkingHours(workingHours: MockWorkingHours): void {
    this.userWorkingHours = workingHours;
  }

  // Generate time slots with break labels (matches timeline-calendar logic)
  generateTimeSlots(selectedDate: Date): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Check day-specific working hours
    const dayHours = this.userWorkingHours[dayName];
    let dayIsEnabled = false;

    if (dayHours) {
      dayIsEnabled = dayHours.enabled || false;
    }

    // Generate slots from 8 AM to 8 PM
    for (let hour = 8; hour <= 20; hour++) {
      const timeStr = hour === 0 ? "12 AM" : 
                     hour === 12 ? "12 PM" : 
                     hour < 12 ? `${hour} AM` : 
                     `${hour - 12} PM`;

      // Check if within working hours
      let isWithinWorkingHours = false;
      let breakLabel = null;
      
      if (dayIsEnabled && dayHours) {
        if (dayHours.enabled && dayHours.start && dayHours.end) {
          const workStart = parseInt(dayHours.start.split(':')[0]);
          const workEnd = parseInt(dayHours.end.split(':')[0]);
          isWithinWorkingHours = hour >= workStart && hour <= workEnd;
          
          // Check if this hour is blocked by break times
          if (isWithinWorkingHours && dayHours.breaks && dayHours.breaks.length > 0) {
            for (const breakTime of dayHours.breaks) {
              const breakStart = parseInt(breakTime.start.split(':')[0]);
              const breakEnd = parseInt(breakTime.end.split(':')[0]);
              // If current hour falls within break time, block it and store label
              // Handle minutes properly - if break ends at :00, include the hour before
              const breakEndMinute = parseInt(breakTime.end.split(':')[1] || '0');
              const shouldIncludeHour = breakEndMinute > 0 ? hour <= breakEnd : hour < breakEnd;
              
              if (hour >= breakStart && shouldIncludeHour) {
                isWithinWorkingHours = false;
                breakLabel = breakTime.label || "Break";
                break;
              }
            }
          }
        }
      }

      slots.push({
        hour,
        time: timeStr,
        appointments: [],
        isBlocked: !isWithinWorkingHours,
        isWithinWorkingHours,
        breakLabel
      });
    }

    return slots;
  }

  // Test specific break label scenarios
  testLunchBreakLabel(): {
    slots: TimeSlot[];
    lunchSlot: TimeSlot | undefined;
    hasCorrectLabel: boolean;
  } {
    const tuesday = new Date('2025-07-08'); // Tuesday
    const slots = this.generateTimeSlots(tuesday);
    const lunchSlot = slots.find(slot => slot.hour === 12);
    const hasCorrectLabel = lunchSlot?.breakLabel === "Lunch Break";
    
    return {
      slots,
      lunchSlot,
      hasCorrectLabel
    };
  }

  testMultipleBreakLabels(): {
    slots: TimeSlot[];
    morningBreak: TimeSlot | undefined;
    lunchBreak: TimeSlot | undefined;
    afternoonBreak: TimeSlot | undefined;
    allLabelsCorrect: boolean;
  } {
    const wednesday = new Date('2025-07-09'); // Wednesday
    const slots = this.generateTimeSlots(wednesday);
    
    const morningBreak = slots.find(slot => slot.hour === 10);
    const lunchBreak = slots.find(slot => slot.hour === 12);
    const afternoonBreak = slots.find(slot => slot.hour === 15);
    
    const allLabelsCorrect = 
      morningBreak?.breakLabel === "Coffee Break" &&
      lunchBreak?.breakLabel === "Lunch Break" &&
      afternoonBreak?.breakLabel === "Afternoon Break";
    
    return {
      slots,
      morningBreak,
      lunchBreak,
      afternoonBreak,
      allLabelsCorrect
    };
  }

  testNoLabelBreak(): {
    slots: TimeSlot[];
    breakSlot: TimeSlot | undefined;
    hasDefaultLabel: boolean;
  } {
    const thursday = new Date('2025-07-10'); // Thursday
    const slots = this.generateTimeSlots(thursday);
    const breakSlot = slots.find(slot => slot.hour === 14);
    const hasDefaultLabel = breakSlot?.breakLabel === "Break";
    
    return {
      slots,
      breakSlot,
      hasDefaultLabel
    };
  }

  testOutsideWorkingHoursVsBreaks(): {
    slots: TimeSlot[];
    beforeWorkSlot: TimeSlot | undefined;
    breakSlot: TimeSlot | undefined;
    afterWorkSlot: TimeSlot | undefined;
    labelsCorrect: boolean;
  } {
    const friday = new Date('2025-07-11'); // Friday
    const slots = this.generateTimeSlots(friday);
    
    const beforeWorkSlot = slots.find(slot => slot.hour === 8); // Before 9 AM
    const breakSlot = slots.find(slot => slot.hour === 12); // Lunch break
    const afterWorkSlot = slots.find(slot => slot.hour === 18); // After 5 PM
    
    const labelsCorrect = 
      beforeWorkSlot?.breakLabel === null && // Should be null for outside working hours
      breakSlot?.breakLabel === "Lunch Break" && // Should have break label
      afterWorkSlot?.breakLabel === null; // Should be null for outside working hours
    
    return {
      slots,
      beforeWorkSlot,
      breakSlot,
      afterWorkSlot,
      labelsCorrect
    };
  }

  // Test UI display logic
  getDisplayText(slot: TimeSlot): string {
    if (slot.isBlocked) {
      return slot.breakLabel || "Outside working hours";
    }
    return "Available";
  }

  validateBreakLabelDisplay(): {
    lunchDisplay: string;
    outsideHoursDisplay: string;
    availableDisplay: string;
    allCorrect: boolean;
  } {
    // Set up working hours with lunch break
    this.setWorkingHours({
      tuesday: {
        enabled: true,
        start: '09:00',
        end: '17:00',
        breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }]
      }
    });

    const tuesday = new Date('2025-07-08');
    const slots = this.generateTimeSlots(tuesday);
    
    const lunchSlot = slots.find(slot => slot.hour === 12)!;
    const outsideSlot = slots.find(slot => slot.hour === 8)!; // Before working hours
    const availableSlot = slots.find(slot => slot.hour === 10)!; // Working hours
    
    const lunchDisplay = this.getDisplayText(lunchSlot);
    const outsideHoursDisplay = this.getDisplayText(outsideSlot);
    const availableDisplay = this.getDisplayText(availableSlot);
    
    const allCorrect = 
      lunchDisplay === "Lunch Break" &&
      outsideHoursDisplay === "Outside working hours" &&
      availableDisplay === "Available";
    
    return {
      lunchDisplay,
      outsideHoursDisplay,
      availableDisplay,
      allCorrect
    };
  }
}

describe('Break Labels in Timeline Calendar', () => {
  let calendar: MockTimelineCalendarWithLabels;

  beforeEach(() => {
    calendar = new MockTimelineCalendarWithLabels();
  });

  describe('Single Break Label', () => {
    it('should display "Lunch Break" label for lunch break hours', () => {
      // Set working hours with lunch break
      calendar.setWorkingHours({
        tuesday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }]
        }
      });

      const result = calendar.testLunchBreakLabel();
      
      expect(result.hasCorrectLabel).toBe(true);
      expect(result.lunchSlot?.isBlocked).toBe(true);
      expect(result.lunchSlot?.breakLabel).toBe('Lunch Break');
      expect(result.lunchSlot?.isWithinWorkingHours).toBe(false);
    });

    it('should show lunch break across multiple hours', () => {
      // Set longer lunch break (12-2 PM)
      calendar.setWorkingHours({
        tuesday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '12:00', end: '14:00', label: 'Extended Lunch' }]
        }
      });

      const tuesday = new Date('2025-07-08');
      const slots = calendar.generateTimeSlots(tuesday);
      
      const noon = slots.find(slot => slot.hour === 12);
      const onePM = slots.find(slot => slot.hour === 13);
      const twoPM = slots.find(slot => slot.hour === 14);
      
      expect(noon?.breakLabel).toBe('Extended Lunch');
      expect(onePM?.breakLabel).toBe('Extended Lunch');
      expect(twoPM?.breakLabel).toBe(null); // Should be working again at 2 PM
    });
  });

  describe('Multiple Break Labels', () => {
    it('should handle multiple breaks with different labels', () => {
      // Set working hours with multiple breaks
      calendar.setWorkingHours({
        wednesday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [
            { start: '10:00', end: '10:30', label: 'Coffee Break' },
            { start: '12:00', end: '13:00', label: 'Lunch Break' },
            { start: '15:00', end: '15:30', label: 'Afternoon Break' }
          ]
        }
      });

      const result = calendar.testMultipleBreakLabels();
      
      expect(result.allLabelsCorrect).toBe(true);
      expect(result.morningBreak?.breakLabel).toBe('Coffee Break');
      expect(result.lunchBreak?.breakLabel).toBe('Lunch Break');
      expect(result.afternoonBreak?.breakLabel).toBe('Afternoon Break');
    });

    it('should not interfere with working hours around breaks', () => {
      calendar.setWorkingHours({
        wednesday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [
            { start: '10:00', end: '11:00', label: 'Coffee Break' },
            { start: '15:00', end: '16:00', label: 'Afternoon Break' }
          ]
        }
      });

      const wednesday = new Date('2025-07-09');
      const slots = calendar.generateTimeSlots(wednesday);
      
      const beforeCoffee = slots.find(slot => slot.hour === 9);
      const afterCoffee = slots.find(slot => slot.hour === 11);
      const beforeAfternoon = slots.find(slot => slot.hour === 14);
      const afterAfternoon = slots.find(slot => slot.hour === 16);
      
      expect(beforeCoffee?.isBlocked).toBe(false);
      expect(afterCoffee?.isBlocked).toBe(false);
      expect(beforeAfternoon?.isBlocked).toBe(false);
      expect(afterAfternoon?.isBlocked).toBe(false);
    });
  });

  describe('Break Labels vs Outside Working Hours', () => {
    it('should distinguish between break labels and outside working hours', () => {
      calendar.setWorkingHours({
        friday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }]
        }
      });

      const result = calendar.testOutsideWorkingHoursVsBreaks();
      
      expect(result.labelsCorrect).toBe(true);
      expect(result.beforeWorkSlot?.isBlocked).toBe(true);
      expect(result.beforeWorkSlot?.breakLabel).toBe(null);
      expect(result.breakSlot?.isBlocked).toBe(true);
      expect(result.breakSlot?.breakLabel).toBe('Lunch Break');
      expect(result.afterWorkSlot?.isBlocked).toBe(true);
      expect(result.afterWorkSlot?.breakLabel).toBe(null);
    });

    it('should show correct display text for each type of blocked time', () => {
      const result = calendar.validateBreakLabelDisplay();
      
      expect(result.allCorrect).toBe(true);
      expect(result.lunchDisplay).toBe('Lunch Break');
      expect(result.outsideHoursDisplay).toBe('Outside working hours');
      expect(result.availableDisplay).toBe('Available');
    });
  });

  describe('Default Break Labels', () => {
    it('should use "Break" as default label when none provided', () => {
      // Set working hours with break but no label
      calendar.setWorkingHours({
        thursday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '14:00', end: '15:00', label: '' }] // Empty label
        }
      });

      const result = calendar.testNoLabelBreak();
      
      expect(result.hasDefaultLabel).toBe(true);
      expect(result.breakSlot?.breakLabel).toBe('Break');
      expect(result.breakSlot?.isBlocked).toBe(true);
    });

    it('should handle missing label property', () => {
      // Set working hours with break without label property
      calendar.setWorkingHours({
        monday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '11:00', end: '12:00' } as any] // Missing label property
        }
      });

      const monday = new Date('2025-07-07');
      const slots = calendar.generateTimeSlots(monday);
      const breakSlot = slots.find(slot => slot.hour === 11);
      
      expect(breakSlot?.breakLabel).toBe('Break'); // Should default to "Break"
      expect(breakSlot?.isBlocked).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle overlapping break times correctly', () => {
      // Set overlapping breaks (should use first match)
      calendar.setWorkingHours({
        monday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [
            { start: '12:00', end: '14:00', label: 'Long Lunch' },
            { start: '13:00', end: '14:00', label: 'Team Meeting' }
          ]
        }
      });

      const monday = new Date('2025-07-07');
      const slots = calendar.generateTimeSlots(monday);
      const overlapSlot = slots.find(slot => slot.hour === 13);
      
      expect(overlapSlot?.breakLabel).toBe('Long Lunch'); // Should use first matching break
    });

    it('should handle break times outside working hours', () => {
      // Set break before working hours start
      calendar.setWorkingHours({
        saturday: {
          enabled: true,
          start: '10:00',
          end: '16:00',
          breaks: [
            { start: '08:00', end: '09:00', label: 'Early Break' }, // Before work
            { start: '17:00', end: '18:00', label: 'Late Break' }    // After work
          ]
        }
      });

      const saturday = new Date('2025-07-12');
      const slots = calendar.generateTimeSlots(saturday);
      
      const earlySlot = slots.find(slot => slot.hour === 8);
      const lateSlot = slots.find(slot => slot.hour === 17);
      
      // Should not show break labels for times outside working hours
      expect(earlySlot?.breakLabel).toBe(null);
      expect(lateSlot?.breakLabel).toBe(null);
      expect(earlySlot?.isBlocked).toBe(true);
      expect(lateSlot?.isBlocked).toBe(true);
    });

    it('should handle disabled days correctly', () => {
      calendar.setWorkingHours({
        sunday: {
          enabled: false,
          start: '10:00',
          end: '16:00',
          breaks: [{ start: '12:00', end: '13:00', label: 'Sunday Lunch' }]
        }
      });

      const sunday = new Date('2025-07-13');
      const slots = calendar.generateTimeSlots(sunday);
      
      // All slots should be blocked without break labels
      slots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
        expect(slot.breakLabel).toBe(null);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical barber shop schedule', () => {
      calendar.setWorkingHours({
        tuesday: {
          enabled: true,
          start: '09:00',
          end: '18:00',
          breaks: [
            { start: '12:00', end: '13:00', label: 'Lunch Break' },
            { start: '15:30', end: '16:00', label: 'Coffee & Cleanup' }
          ]
        }
      });

      const tuesday = new Date('2025-07-08');
      const slots = calendar.generateTimeSlots(tuesday);
      
      // Check key time slots
      const morning = slots.find(slot => slot.hour === 10);
      const lunch = slots.find(slot => slot.hour === 12);
      const afternoon = slots.find(slot => slot.hour === 14);
      const coffee = slots.find(slot => slot.hour === 15);
      const evening = slots.find(slot => slot.hour === 17);
      
      expect(morning?.isBlocked).toBe(false); // Working
      expect(lunch?.breakLabel).toBe('Lunch Break'); // Lunch break
      expect(afternoon?.isBlocked).toBe(false); // Working after lunch
      expect(coffee?.breakLabel).toBe('Coffee & Cleanup'); // Coffee break
      expect(evening?.isBlocked).toBe(false); // Working in evening
    });

    it('should update labels when working hours change', () => {
      // Initial schedule
      calendar.setWorkingHours({
        wednesday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '12:00', end: '13:00', label: 'Lunch' }]
        }
      });

      const wednesday = new Date('2025-07-09');
      let slots = calendar.generateTimeSlots(wednesday);
      let lunchSlot = slots.find(slot => slot.hour === 12);
      
      expect(lunchSlot?.breakLabel).toBe('Lunch');

      // Update schedule
      calendar.setWorkingHours({
        wednesday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '12:00', end: '13:00', label: 'Team Meeting' }]
        }
      });

      slots = calendar.generateTimeSlots(wednesday);
      lunchSlot = slots.find(slot => slot.hour === 12);
      
      expect(lunchSlot?.breakLabel).toBe('Team Meeting'); // Should reflect new label
    });
  });
});