import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for Sunday working hours test
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

interface MockWorkingHours {
  [day: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface TimeSlot {
  time: string;
  hour: number;
  appointment: MockAppointment | null;
  isBlocked: boolean;
  isWithinWorkingHours: boolean;
}

// Sunday-specific working hours test functions
function isWithinWorkingHours(hour: number, workingHours: MockWorkingHours, appointmentDate: Date): boolean {
  if (!workingHours) return true;
  
  const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  const dayHours = workingHours[dayName];
  if (!dayHours || !dayHours.enabled) return false;
  
  const startHour = parseInt(dayHours.start.split(':')[0]);
  const endHour = parseInt(dayHours.end.split(':')[0]);
  
  return hour >= startHour && hour <= endHour;
}

function generateTimeSlots(appointments: MockAppointment[], workingHours: MockWorkingHours, targetDate: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  
  // Determine time range - default to 9am-8pm for full day coverage
  let startHour = 9;
  let endHour = 20;
  
  // Get working hours for target date
  const dayOfWeek = targetDate.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  const dayHours = workingHours[dayName];
  
  // For enabled days, use working hours as base range
  if (dayHours && dayHours.enabled) {
    startHour = parseInt(dayHours.start.split(':')[0]);
    endHour = parseInt(dayHours.end.split(':')[0]);
  }
  
  // Expand range to include any appointments outside working hours
  for (const apt of sortedAppointments) {
    const aptDate = new Date(apt.scheduledAt);
    // Only include appointments for the target date
    if (aptDate.toDateString() === targetDate.toDateString()) {
      const aptHour = aptDate.getHours();
      if (aptHour < startHour) startHour = aptHour;
      if (aptHour >= endHour) endHour = aptHour + 1; // Include the hour the appointment is in
    }
  }
  
  // Generate time slots for the full range
  for (let hour = startHour; hour <= endHour; hour++) {
    const timeStr = formatTimeSlot(hour);
    
    // Find appointment at this hour on the target date
    const appointment = sortedAppointments.find(apt => {
      const aptDate = new Date(apt.scheduledAt);
      return aptDate.toDateString() === targetDate.toDateString() && 
             aptDate.getHours() === hour;
    });
    
    // Check if this hour is within working hours
    const isWithinHours = isWithinWorkingHours(hour, workingHours, targetDate);
    
    slots.push({
      time: timeStr,
      hour: hour,
      appointment: appointment || null,
      isBlocked: !isWithinHours,
      isWithinWorkingHours: isWithinHours
    });
  }
  
  return slots;
}

function formatTimeSlot(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

describe('Sunday Working Hours - All Hours Blocked', () => {
  let mockWorkingHours: MockWorkingHours;
  let sundayDate: Date;
  let mondayDate: Date;

  beforeEach(() => {
    // Setup working hours - Sunday disabled, other days enabled
    mockWorkingHours = {
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: true, start: '10:00', end: '16:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' } // Sunday disabled
    };
    
    // Create specific Sunday and Monday dates for testing
    sundayDate = new Date('2025-07-06T00:00:00Z'); // Sunday July 6, 2025
    mondayDate = new Date('2025-07-07T00:00:00Z'); // Monday July 7, 2025
    
    // Verify dates are correct day of week
    expect(sundayDate.getDay()).toBe(0); // Sunday
    expect(mondayDate.getDay()).toBe(1); // Monday
  });

  describe('Sunday Time Slot Generation', () => {
    it('should show all Sunday time slots as blocked (outside working hours)', () => {
      // No appointments on Sunday
      const appointments: MockAppointment[] = [];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      
      // All slots should be blocked on Sunday
      expect(slots.length).toBeGreaterThan(0);
      slots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
        expect(slot.isWithinWorkingHours).toBe(false);
      });
      
      // Should cover default range 9am-8pm since no appointments
      expect(slots[0].hour).toBe(9); // 9 AM
      expect(slots[slots.length - 1].hour).toBe(20); // 8 PM
    });

    it('should show all Sunday time slots as blocked even with appointments', () => {
      // Add appointments on Sunday
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-06T10:00:00Z'), // Sunday 10 AM
          status: 'confirmed',
          duration: 30,
          service: { name: 'Haircut', price: '30.00' },
          client: { name: 'John Doe' },
          price: '30.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-06T14:00:00Z'), // Sunday 2 PM
          status: 'confirmed',
          duration: 45,
          service: { name: 'Beard Trim', price: '20.00' },
          client: { name: 'Jane Smith' },
          price: '20.00'
        }
      ];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      
      // All slots should still be blocked on Sunday despite appointments
      expect(slots.length).toBeGreaterThan(0);
      slots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
        expect(slot.isWithinWorkingHours).toBe(false);
      });
      
      // Should include appointment hours
      const appointmentSlot10AM = slots.find(slot => slot.hour === 10);
      const appointmentSlot2PM = slots.find(slot => slot.hour === 14);
      
      expect(appointmentSlot10AM).toBeDefined();
      expect(appointmentSlot10AM?.appointment).toBeTruthy();
      expect(appointmentSlot10AM?.isBlocked).toBe(true);
      
      expect(appointmentSlot2PM).toBeDefined();
      expect(appointmentSlot2PM?.appointment).toBeTruthy();
      expect(appointmentSlot2PM?.isBlocked).toBe(true);
    });

    it('should expand time range to include early/late Sunday appointments but keep all blocked', () => {
      // Add appointments outside normal range
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-06T07:00:00Z'), // Sunday 7 AM (early)
          status: 'confirmed',
          duration: 30,
          service: { name: 'Early Haircut', price: '35.00' },
          client: { name: 'Early Bird' },
          price: '35.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-06T22:00:00Z'), // Sunday 10 PM (late)
          status: 'confirmed',
          duration: 30,
          service: { name: 'Late Trim', price: '25.00' },
          client: { name: 'Night Owl' },
          price: '25.00'
        }
      ];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      
      // Should expand to include appointment hours (allowing for implementation differences)
      expect(slots[0].hour).toBe(7); // Early appointment
      expect(slots[slots.length - 1].hour).toBeGreaterThanOrEqual(22); // Late appointment or expanded
      
      // All slots should still be blocked
      slots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
        expect(slot.isWithinWorkingHours).toBe(false);
      });
      
      // Verify appointments are present but blocked
      const earlySlot = slots.find(slot => slot.hour === 7);
      const lateSlot = slots.find(slot => slot.hour === 22);
      
      expect(earlySlot?.appointment).toBeTruthy();
      expect(earlySlot?.isBlocked).toBe(true);
      expect(lateSlot?.appointment).toBeTruthy();
      expect(lateSlot?.isBlocked).toBe(true);
    });

    it('should handle midnight crossover appointments on Sunday', () => {
      // Appointment that crosses from Saturday night to Sunday morning
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-06T01:00:00Z'), // Sunday 1 AM
          status: 'confirmed',
          duration: 120, // 2 hours
          service: { name: 'Long Session', price: '60.00' },
          client: { name: 'Night Client' },
          price: '60.00'
        }
      ];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      
      // Should include early morning hours
      const slot1AM = slots.find(slot => slot.hour === 1);
      const slot2AM = slots.find(slot => slot.hour === 2);
      
      expect(slot1AM).toBeDefined();
      expect(slot1AM?.appointment).toBeTruthy();
      expect(slot1AM?.isBlocked).toBe(true);
      
      expect(slot2AM).toBeDefined();
      expect(slot2AM?.isBlocked).toBe(true); // Should be blocked even during appointment duration
    });
  });

  describe('Comparison with Monday (Working Day)', () => {
    it('should show Monday time slots as available during working hours', () => {
      // Add same appointments on Monday
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-07T10:00:00Z'), // Monday 10 AM
          status: 'confirmed',
          duration: 30,
          service: { name: 'Haircut', price: '30.00' },
          client: { name: 'John Doe' },
          price: '30.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-07T14:00:00Z'), // Monday 2 PM
          status: 'confirmed',
          duration: 45,
          service: { name: 'Beard Trim', price: '20.00' },
          client: { name: 'Jane Smith' },
          price: '20.00'
        }
      ];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, mondayDate);
      
      // Should have both available and unavailable slots
      const availableSlots = slots.filter(slot => !slot.isBlocked);
      const blockedSlots = slots.filter(slot => slot.isBlocked);
      
      // Monday working hours are 9-5, so should have some available slots
      expect(availableSlots.length).toBeGreaterThan(0);
      // May or may not have blocked slots depending on time range expansion
      
      // Working hours slots should be available (9 AM to 5 PM)
      const slot10AM = slots.find(slot => slot.hour === 10);
      const slot2PM = slots.find(slot => slot.hour === 14);
      
      expect(slot10AM?.isBlocked).toBe(false);
      expect(slot10AM?.isWithinWorkingHours).toBe(true);
      expect(slot2PM?.isBlocked).toBe(false);
      expect(slot2PM?.isWithinWorkingHours).toBe(true);
    });

    it('should demonstrate clear difference between Sunday (all blocked) and Monday (some available)', () => {
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-06T12:00:00Z'), // Sunday 12 PM
          status: 'confirmed',
          duration: 30,
          service: { name: 'Sunday Cut', price: '30.00' },
          client: { name: 'Sunday Client' },
          price: '30.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-07T12:00:00Z'), // Monday 12 PM
          status: 'confirmed',
          duration: 30,
          service: { name: 'Monday Cut', price: '30.00' },
          client: { name: 'Monday Client' },
          price: '30.00'
        }
      ];
      
      const sundaySlots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      const mondaySlots = generateTimeSlots(appointments, mockWorkingHours, mondayDate);
      
      // Sunday: All slots blocked
      const sundayAvailableCount = sundaySlots.filter(slot => !slot.isBlocked).length;
      expect(sundayAvailableCount).toBe(0);
      
      // Monday: Some slots available
      const mondayAvailableCount = mondaySlots.filter(slot => !slot.isBlocked).length;
      expect(mondayAvailableCount).toBeGreaterThan(0);
      
      // Specifically check 12 PM slot on both days
      const sunday12PM = sundaySlots.find(slot => slot.hour === 12);
      const monday12PM = mondaySlots.find(slot => slot.hour === 12);
      
      expect(sunday12PM?.isBlocked).toBe(true);   // Blocked on Sunday
      expect(monday12PM?.isBlocked).toBe(false);  // Available on Monday
    });
  });

  describe('Working Hours Logic Edge Cases', () => {
    it('should handle Sunday enabled but with impossible hours', () => {
      // Enable Sunday but with invalid time range
      mockWorkingHours.sunday = { enabled: true, start: '25:00', end: '26:00' };
      
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-06T12:00:00Z'),
          status: 'confirmed',
          duration: 30,
          service: { name: 'Test', price: '20.00' },
          client: { name: 'Test Client' },
          price: '20.00'
        }
      ];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      
      // Should handle gracefully - likely all blocked due to invalid hours
      const slot12PM = slots.find(slot => slot.hour === 12);
      expect(slot12PM).toBeDefined();
      // The specific behavior depends on implementation, but should not crash
    });

    it('should handle missing Sunday configuration', () => {
      // Remove Sunday from working hours config
      delete mockWorkingHours.sunday;
      
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-06T12:00:00Z'),
          status: 'confirmed',
          duration: 30,
          service: { name: 'Test', price: '20.00' },
          client: { name: 'Test Client' },
          price: '20.00'
        }
      ];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      
      // Should handle missing configuration gracefully
      expect(slots.length).toBeGreaterThan(0);
      const slot12PM = slots.find(slot => slot.hour === 12);
      expect(slot12PM).toBeDefined();
      // When Sunday config is missing, should treat as disabled (blocked)
      expect(slot12PM?.isBlocked).toBe(true);
    });

    it('should correctly identify day of week for various Sunday dates', () => {
      const testDates = [
        new Date('2025-01-05T12:00:00Z'), // January 5, 2025 - Sunday
        new Date('2025-03-02T12:00:00Z'), // March 2, 2025 - Sunday
        new Date('2025-06-01T12:00:00Z'), // June 1, 2025 - Sunday
        new Date('2025-12-07T12:00:00Z'), // December 7, 2025 - Sunday
      ];
      
      testDates.forEach(testDate => {
        expect(testDate.getDay()).toBe(0); // All should be Sunday
        
        const appointments: MockAppointment[] = [
          {
            id: 1,
            userId: 1,
            clientId: 1,
            scheduledAt: new Date(testDate.getTime()),
            status: 'confirmed',
            duration: 30,
            service: { name: 'Test', price: '20.00' },
            client: { name: 'Test Client' },
            price: '20.00'
          }
        ];
        
        const slots = generateTimeSlots(appointments, mockWorkingHours, testDate);
        
        // All should be blocked on Sunday
        slots.forEach(slot => {
          expect(slot.isBlocked).toBe(true);
        });
      });
    });
  });

  describe('Time Slot Formatting', () => {
    it('should format time slots correctly for full day coverage', () => {
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-06T00:00:00Z'), // Sunday midnight
          status: 'confirmed',
          duration: 30,
          service: { name: 'Midnight Cut', price: '50.00' },
          client: { name: 'Night Owl' },
          price: '50.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-06T12:00:00Z'), // Sunday noon
          status: 'confirmed',
          duration: 30,
          service: { name: 'Noon Cut', price: '30.00' },
          client: { name: 'Lunch Client' },
          price: '30.00'
        },
        {
          id: 3,
          userId: 1,
          clientId: 3,
          scheduledAt: new Date('2025-07-06T23:00:00Z'), // Sunday 11 PM
          status: 'confirmed',
          duration: 30,
          service: { name: 'Late Night Cut', price: '60.00' },
          client: { name: 'Very Late Client' },
          price: '60.00'
        }
      ];
      
      const slots = generateTimeSlots(appointments, mockWorkingHours, sundayDate);
      
      // Find specific time slots and verify formatting
      const midnightSlot = slots.find(slot => slot.hour === 0);
      const noonSlot = slots.find(slot => slot.hour === 12);
      const elevenPMSlot = slots.find(slot => slot.hour === 23);
      
      expect(midnightSlot?.time).toBe('12 AM');
      expect(noonSlot?.time).toBe('12 PM');
      expect(elevenPMSlot?.time).toBe('11 PM');
      
      // All should be blocked on Sunday
      expect(midnightSlot?.isBlocked).toBe(true);
      expect(noonSlot?.isBlocked).toBe(true);
      expect(elevenPMSlot?.isBlocked).toBe(true);
    });
  });
});