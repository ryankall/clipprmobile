import { describe, it, expect, beforeEach } from 'vitest';

// Mock appointment data structure
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

// Mock working hours structure
interface MockWorkingHours {
  [day: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

// Slot interface
interface TimeSlot {
  time: string;
  hour: number;
  appointment: MockAppointment | null;
  isBlocked: boolean;
}

// Helper function to generate time slots for calendar view
function generateTimeSlots(appointments: MockAppointment[], workingHours?: MockWorkingHours): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  
  // Determine time range - default to working hours, expand for appointments outside range
  let startHour = 9; // fallback if no working hours
  let endHour = 20;   // fallback if no working hours
  
  // Get working hours for current day
  if (workingHours) {
    const today = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[today];
    const dayHours = workingHours[dayName];
    
    if (dayHours && dayHours.enabled) {
      startHour = parseInt(dayHours.start.split(':')[0]);
      endHour = parseInt(dayHours.end.split(':')[0]);
    }
  }
  
  // Check if any appointments are outside the working hours range
  for (const apt of sortedAppointments) {
    const aptHour = new Date(apt.scheduledAt).getHours();
    if (aptHour < startHour) startHour = aptHour;
    if (aptHour > endHour) endHour = aptHour;
  }
  
  // Generate time slots
  for (let hour = startHour; hour <= endHour; hour++) {
    const timeStr = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
    
    // Check if there's an appointment at this time
    const appointment = sortedAppointments.find(apt => {
      const aptTime = new Date(apt.scheduledAt);
      return aptTime.getHours() === hour;
    });
    
    // Check if this hour is blocked by working hours
    const isBlocked = workingHours ? !isWithinWorkingHours(hour, workingHours) : false;
    
    slots.push({
      time: timeStr,
      hour: hour,
      appointment: appointment || null,
      isBlocked: isBlocked
    });
  }
  
  return slots;
}

// Helper function to check if hour is within working hours
function isWithinWorkingHours(hour: number, workingHours: MockWorkingHours): boolean {
  if (!workingHours) return true;
  
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[today];
  
  const dayHours = workingHours[dayName];
  if (!dayHours || !dayHours.enabled) return false;
  
  const startHour = parseInt(dayHours.start.split(':')[0]);
  const endHour = parseInt(dayHours.end.split(':')[0]);
  
  return hour >= startHour && hour <= endHour;
}

describe('Calendar Working Hours Tests', () => {
  let mockWorkingHours: MockWorkingHours;

  beforeEach(() => {
    // Reset mock data before each test
    mockWorkingHours = {
      monday: { enabled: true, start: '10:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '11:00', end: '19:00' },
      thursday: { enabled: true, start: '08:00', end: '16:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: true, start: '12:00', end: '20:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' }
    };
  });

  describe('Default Time Range Based on Working Hours', () => {
    it('should use working hours as default range (10am-6pm for Monday)', () => {
      // Mock today as Monday (day 1)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 1; };
      
      const slots = generateTimeSlots([], mockWorkingHours);
      
      // Should show 10am to 6pm (9 hours)
      expect(slots).toHaveLength(9);
      expect(slots[0].hour).toBe(10);
      expect(slots[0].time).toBe('10 AM');
      expect(slots[8].hour).toBe(18);
      expect(slots[8].time).toBe('6 PM');
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    it('should use different working hours for different days (Saturday 12pm-8pm)', () => {
      // Mock today as Saturday (day 6)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 6; };
      
      const slots = generateTimeSlots([], mockWorkingHours);
      
      // Should show 12pm to 8pm (9 hours)
      expect(slots).toHaveLength(9);
      expect(slots[0].hour).toBe(12);
      expect(slots[0].time).toBe('12 PM');
      expect(slots[8].hour).toBe(20);
      expect(slots[8].time).toBe('8 PM');
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    it('should fall back to 9am-8pm when day is disabled (Sunday)', () => {
      // Mock today as Sunday (day 0)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 0; };
      
      const slots = generateTimeSlots([], mockWorkingHours);
      
      // Should fall back to 9am-8pm
      expect(slots).toHaveLength(12);
      expect(slots[0].hour).toBe(9);
      expect(slots[0].time).toBe('9 AM');
      expect(slots[11].hour).toBe(20);
      expect(slots[11].time).toBe('8 PM');
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Calendar Expansion for Outside Appointments', () => {
    it('should expand calendar for early appointment (8am) on Monday (normal 10am-6pm)', () => {
      // Mock today as Monday (day 1)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 1; };
      
      const earlyAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T08:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Early Haircut', price: '25.00' },
        client: { name: 'Early Bird' },
        price: '25.00'
      };

      const slots = generateTimeSlots([earlyAppointment], mockWorkingHours);
      
      // Should expand from 8am to 6pm
      expect(slots[0].hour).toBe(8);
      expect(slots[0].time).toBe('8 AM');
      expect(slots[slots.length - 1].hour).toBe(18);
      expect(slots[0].appointment).toBe(earlyAppointment);
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    it('should expand calendar for late appointment (10pm) on Monday (normal 10am-6pm)', () => {
      // Mock today as Monday (day 1)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 1; };
      
      const lateAppointment: MockAppointment = {
        id: 2,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T22:00:00Z'),
        status: 'confirmed',
        duration: 45,
        service: { name: 'Late Service', price: '50.00' },
        client: { name: 'Night Owl' },
        price: '50.00'
      };

      const slots = generateTimeSlots([lateAppointment], mockWorkingHours);
      
      // Should expand from 10am to 10pm
      expect(slots[0].hour).toBe(10);
      expect(slots[slots.length - 1].hour).toBe(22);
      expect(slots[slots.length - 1].time).toBe('10 PM');
      expect(slots[slots.length - 1].appointment).toBe(lateAppointment);
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Blocked Time Slots Outside Working Hours', () => {
    it('should block hours outside Monday working hours (10am-6pm)', () => {
      // Mock today as Monday (day 1)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 1; };
      
      const earlyAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T08:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Early Haircut', price: '25.00' },
        client: { name: 'Early Bird' },
        price: '25.00'
      };

      const lateAppointment: MockAppointment = {
        id: 2,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T20:00:00Z'),
        status: 'confirmed',
        duration: 45,
        service: { name: 'Late Service', price: '50.00' },
        client: { name: 'Night Owl' },
        price: '50.00'
      };

      const slots = generateTimeSlots([earlyAppointment, lateAppointment], mockWorkingHours);
      
      // 8am should be blocked (before 10am working hours)
      const eightAmSlot = slots.find(slot => slot.hour === 8);
      expect(eightAmSlot?.isBlocked).toBe(true);
      expect(eightAmSlot?.appointment).toBe(earlyAppointment);
      
      // 9am should be blocked (before 10am working hours)
      const nineAmSlot = slots.find(slot => slot.hour === 9);
      expect(nineAmSlot?.isBlocked).toBe(true);
      
      // 12pm should not be blocked (within 10am-6pm working hours)
      const twelvePmSlot = slots.find(slot => slot.hour === 12);
      expect(twelvePmSlot?.isBlocked).toBe(false);
      
      // 7pm should be blocked (after 6pm working hours)
      const sevenPmSlot = slots.find(slot => slot.hour === 19);
      expect(sevenPmSlot?.isBlocked).toBe(true);
      
      // 8pm should be blocked (after 6pm working hours)
      const eightPmSlot = slots.find(slot => slot.hour === 20);
      expect(eightPmSlot?.isBlocked).toBe(true);
      expect(eightPmSlot?.appointment).toBe(lateAppointment);
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    it('should block all hours on disabled days (Sunday)', () => {
      // Mock today as Sunday (day 0)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 0; };
      
      const appointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T12:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Sunday Service', price: '25.00' },
        client: { name: 'Sunday Client' },
        price: '25.00'
      };

      const slots = generateTimeSlots([appointment], mockWorkingHours);
      
      // All slots should be blocked on Sunday (disabled day)
      slots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
      });
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    it('should handle Thursday early hours (8am-4pm working hours)', () => {
      // Mock today as Thursday (day 4)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 4; };
      
      const earlyAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T06:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Very Early', price: '25.00' },
        client: { name: 'Very Early Bird' },
        price: '25.00'
      };

      const slots = generateTimeSlots([earlyAppointment], mockWorkingHours);
      
      // Should expand from 6am to 4pm
      expect(slots[0].hour).toBe(6);
      expect(slots[slots.length - 1].hour).toBe(16);
      
      // 6am should be blocked (before 8am working hours)
      const sixAmSlot = slots.find(slot => slot.hour === 6);
      expect(sixAmSlot?.isBlocked).toBe(true);
      
      // 7am should be blocked (before 8am working hours)
      const sevenAmSlot = slots.find(slot => slot.hour === 7);
      expect(sevenAmSlot?.isBlocked).toBe(true);
      
      // 8am should not be blocked (start of working hours)
      const eightAmSlot = slots.find(slot => slot.hour === 8);
      expect(eightAmSlot?.isBlocked).toBe(false);
      
      // 4pm should not be blocked (end of working hours)
      const fourPmSlot = slots.find(slot => slot.hour === 16);
      expect(fourPmSlot?.isBlocked).toBe(false);
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Real-world Scenario Testing', () => {
    it('should correctly show July 5th calendar with proper blocking', () => {
      // Mock today as Saturday (July 5th would be Saturday)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 6; };
      
      // Saturday working hours: 12pm-8pm
      const appointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T14:00:00Z'), // 2pm
        status: 'confirmed',
        duration: 30,
        service: { name: 'Saturday Cut', price: '25.00' },
        client: { name: 'Weekend Client' },
        price: '25.00'
      };

      const slots = generateTimeSlots([appointment], mockWorkingHours);
      
      // Should show 12pm to 8pm (Saturday working hours)
      expect(slots[0].hour).toBe(12);
      expect(slots[slots.length - 1].hour).toBe(20);
      
      // 9am would be blocked if expanded to show it
      // 2pm should not be blocked (within 12pm-8pm)
      const twoPmSlot = slots.find(slot => slot.hour === 14);
      expect(twoPmSlot?.isBlocked).toBe(false);
      expect(twoPmSlot?.appointment).toBe(appointment);
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });
  });
});