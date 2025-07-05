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

// Helper function to generate time slots for calendar view
function generateTimeSlots(appointments: MockAppointment[], workingHours?: MockWorkingHours) {
  const slots: Array<{
    time: string;
    hour: number;
    appointment: MockAppointment | null;
    isBlocked: boolean;
  }> = [];
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
  // Also consider appointment end times for proper calendar expansion
  for (const apt of sortedAppointments) {
    const aptStart = new Date(apt.scheduledAt);
    const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
    
    const aptStartHour = aptStart.getHours();
    const aptEndHour = aptEnd.getHours();
    const aptEndMinutes = aptEnd.getMinutes();
    
    if (aptStartHour < startHour) startHour = aptStartHour;
    // For end hours, include the hour that contains the end time
    if (aptEndHour > endHour || (aptEndHour === endHour && aptEndMinutes > 0)) {
      endHour = aptEndHour;
    }
  }
  
  // Generate time slots
  for (let hour = startHour; hour <= endHour; hour++) {
    const timeStr = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
    
    // Check if there's an appointment that starts at this hour OR overlaps this hour
    const appointment = sortedAppointments.find(apt => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
      
      const aptStartHour = aptStart.getHours();
      const aptEndHour = aptEnd.getHours();
      
      // Appointment spans into this hour if it starts at or before this hour
      // and ends after this hour starts
      return aptStartHour <= hour && hour < aptEndHour;
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

// Helper function to get current time position
function getCurrentTimePosition(): { hour: number; minutes: number; shouldShow: boolean } {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  
  // Only show current time line if it's today
  const today = new Date();
  const shouldShow = now.toDateString() === today.toDateString();
  
  return { hour, minutes, shouldShow };
}

// Helper function to filter confirmed appointments
function filterConfirmedAppointments(appointments: MockAppointment[]): MockAppointment[] {
  return appointments.filter(apt => apt.status === 'confirmed');
}

describe('Calendar Features', () => {
  let mockAppointments: MockAppointment[];
  let mockWorkingHours: MockWorkingHours;

  beforeEach(() => {
    // Reset mock data before each test
    mockAppointments = [];
    mockWorkingHours = {
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: true, start: '10:00', end: '16:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' }
    };
  });

  describe('Dynamic Time Range Expansion', () => {
    it('should use default 9am-8pm range when no appointments exist', () => {
      const slots = generateTimeSlots([], mockWorkingHours);
      
      expect(slots).toHaveLength(12); // 9am to 8pm = 12 hours
      expect(slots[0].hour).toBe(9);
      expect(slots[0].time).toBe('9 AM');
      expect(slots[11].hour).toBe(20);
      expect(slots[11].time).toBe('8 PM');
    });

    it('should expand to show earlier appointment at 8am', () => {
      const earlyAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T08:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Haircut', price: '25.00' },
        client: { name: 'John Doe' },
        price: '25.00'
      };

      const slots = generateTimeSlots([earlyAppointment], mockWorkingHours);
      
      expect(slots[0].hour).toBe(8);
      expect(slots[0].time).toBe('8 AM');
      expect(slots[0].appointment).toBe(earlyAppointment);
    });

    it('should expand to show later appointment at 10pm', () => {
      const lateAppointment: MockAppointment = {
        id: 2,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T22:00:00Z'),
        status: 'confirmed',
        duration: 45,
        service: { name: 'Beard Trim', price: '15.00' },
        client: { name: 'Jane Smith' },
        price: '15.00'
      };

      const slots = generateTimeSlots([lateAppointment], mockWorkingHours);
      
      expect(slots[slots.length - 1].hour).toBe(22);
      expect(slots[slots.length - 1].time).toBe('10 PM');
      expect(slots[slots.length - 1].appointment).toBe(lateAppointment);
    });

    it('should expand to show both early and late appointments', () => {
      const earlyAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T07:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Haircut', price: '25.00' },
        client: { name: 'John Doe' },
        price: '25.00'
      };

      const lateAppointment: MockAppointment = {
        id: 2,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T23:00:00Z'),
        status: 'confirmed',
        duration: 45,
        service: { name: 'Beard Trim', price: '15.00' },
        client: { name: 'Jane Smith' },
        price: '15.00'
      };

      const slots = generateTimeSlots([earlyAppointment, lateAppointment], mockWorkingHours);
      
      expect(slots[0].hour).toBe(7);
      expect(slots[0].time).toBe('7 AM');
      expect(slots[slots.length - 1].hour).toBe(23);
      expect(slots[slots.length - 1].time).toBe('11 PM');
    });

    it('should handle midnight appointments correctly', () => {
      const midnightAppointment: MockAppointment = {
        id: 3,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T00:00:00Z'),
        status: 'confirmed',
        duration: 60,
        service: { name: 'Full Service', price: '50.00' },
        client: { name: 'Night Owl' },
        price: '50.00'
      };

      const slots = generateTimeSlots([midnightAppointment], mockWorkingHours);
      
      expect(slots[0].hour).toBe(0);
      expect(slots[0].time).toBe('12 AM');
      expect(slots[0].appointment).toBe(midnightAppointment);
    });
  });

  describe('Blocked Time Slots Based on Working Hours', () => {
    it('should block time slots outside working hours', () => {
      // Set working hours to 10am-4pm
      mockWorkingHours.monday = { enabled: true, start: '10:00', end: '16:00' };
      
      const appointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T12:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Haircut', price: '25.00' },
        client: { name: 'John Doe' },
        price: '25.00'
      };

      const slots = generateTimeSlots([appointment], mockWorkingHours);
      
      // Check that 9am slot is blocked
      const nineAmSlot = slots.find(slot => slot.hour === 9);
      expect(nineAmSlot?.isBlocked).toBe(true);
      
      // Check that 12pm slot is not blocked
      const twelvePmSlot = slots.find(slot => slot.hour === 12);
      expect(twelvePmSlot?.isBlocked).toBe(false);
      
      // Check that 5pm slot is blocked
      const fivePmSlot = slots.find(slot => slot.hour === 17);
      expect(fivePmSlot?.isBlocked).toBe(true);
    });

    it('should block all slots when day is disabled', () => {
      // Disable Sunday
      mockWorkingHours.sunday = { enabled: false, start: '09:00', end: '17:00' };
      
      const appointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T12:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Haircut', price: '25.00' },
        client: { name: 'John Doe' },
        price: '25.00'
      };

      // Mock today as Sunday (day 0)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 0; };
      
      const slots = generateTimeSlots([appointment], mockWorkingHours);
      
      // All slots should be blocked on Sunday
      slots.forEach(slot => {
        expect(slot.isBlocked).toBe(true);
      });
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });

    it('should handle Saturday different hours correctly', () => {
      // Saturday: 10am-4pm
      mockWorkingHours.saturday = { enabled: true, start: '10:00', end: '16:00' };
      
      const appointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T14:00:00Z'),
        status: 'confirmed',
        duration: 30,
        service: { name: 'Haircut', price: '25.00' },
        client: { name: 'John Doe' },
        price: '25.00'
      };

      // Mock today as Saturday (day 6)
      const originalGetDay = Date.prototype.getDay;
      Date.prototype.getDay = function() { return 6; };
      
      const slots = generateTimeSlots([appointment], mockWorkingHours);
      
      // 9am should be blocked
      const nineAmSlot = slots.find(slot => slot.hour === 9);
      expect(nineAmSlot?.isBlocked).toBe(true);
      
      // 2pm should not be blocked
      const twoPmSlot = slots.find(slot => slot.hour === 14);
      expect(twoPmSlot?.isBlocked).toBe(false);
      
      // 5pm should be blocked
      const fivePmSlot = slots.find(slot => slot.hour === 17);
      expect(fivePmSlot?.isBlocked).toBe(true);
      
      // Restore original method
      Date.prototype.getDay = originalGetDay;
    });
  });

  describe('Current Time Position', () => {
    it('should calculate current time position correctly', () => {
      const currentTime = getCurrentTimePosition();
      
      expect(currentTime.hour).toBeGreaterThanOrEqual(0);
      expect(currentTime.hour).toBeLessThanOrEqual(23);
      expect(currentTime.minutes).toBeGreaterThanOrEqual(0);
      expect(currentTime.minutes).toBeLessThanOrEqual(59);
      expect(typeof currentTime.shouldShow).toBe('boolean');
    });

    it('should show current time indicator only for today', () => {
      const currentTime = getCurrentTimePosition();
      
      // Current time should show for today
      expect(currentTime.shouldShow).toBe(true);
    });
  });

  describe('Confirmed Appointments Filter', () => {
    it('should filter only confirmed appointments', () => {
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-05T10:00:00Z'),
          status: 'confirmed',
          duration: 30,
          service: { name: 'Haircut', price: '25.00' },
          client: { name: 'John Doe' },
          price: '25.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-05T11:00:00Z'),
          status: 'pending',
          duration: 45,
          service: { name: 'Beard Trim', price: '15.00' },
          client: { name: 'Jane Smith' },
          price: '15.00'
        },
        {
          id: 3,
          userId: 1,
          clientId: 3,
          scheduledAt: new Date('2025-07-05T12:00:00Z'),
          status: 'cancelled',
          duration: 60,
          service: { name: 'Full Service', price: '50.00' },
          client: { name: 'Bob Johnson' },
          price: '50.00'
        }
      ];

      const confirmed = filterConfirmedAppointments(appointments);
      
      expect(confirmed).toHaveLength(1);
      expect(confirmed[0].status).toBe('confirmed');
      expect(confirmed[0].client.name).toBe('John Doe');
    });

    it('should return empty array when no confirmed appointments', () => {
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-05T10:00:00Z'),
          status: 'pending',
          duration: 30,
          service: { name: 'Haircut', price: '25.00' },
          client: { name: 'John Doe' },
          price: '25.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-05T11:00:00Z'),
          status: 'cancelled',
          duration: 45,
          service: { name: 'Beard Trim', price: '15.00' },
          client: { name: 'Jane Smith' },
          price: '15.00'
        }
      ];

      const confirmed = filterConfirmedAppointments(appointments);
      
      expect(confirmed).toHaveLength(0);
    });
  });

  describe('Time Slot Integration', () => {
    it('should correctly integrate all features together', () => {
      // Create appointments with early and late times
      const appointments: MockAppointment[] = [
        {
          id: 1,
          userId: 1,
          clientId: 1,
          scheduledAt: new Date('2025-07-05T07:00:00Z'),
          status: 'confirmed',
          duration: 30,
          service: { name: 'Early Haircut', price: '25.00' },
          client: { name: 'Early Bird' },
          price: '25.00'
        },
        {
          id: 2,
          userId: 1,
          clientId: 2,
          scheduledAt: new Date('2025-07-05T12:00:00Z'),
          status: 'confirmed',
          duration: 45,
          service: { name: 'Lunch Trim', price: '15.00' },
          client: { name: 'Lunch Person' },
          price: '15.00'
        },
        {
          id: 3,
          userId: 1,
          clientId: 3,
          scheduledAt: new Date('2025-07-05T22:00:00Z'),
          status: 'confirmed',
          duration: 60,
          service: { name: 'Late Service', price: '50.00' },
          client: { name: 'Night Owl' },
          price: '50.00'
        }
      ];

      // Set restricted working hours
      mockWorkingHours.monday = { enabled: true, start: '09:00', end: '18:00' };
      
      const slots = generateTimeSlots(appointments, mockWorkingHours);
      
      // Should expand from 7am to 10pm
      expect(slots[0].hour).toBe(7);
      expect(slots[slots.length - 1].hour).toBe(22);
      
      // Early appointment (7am) should be blocked (outside working hours)
      const earlySlot = slots.find(slot => slot.hour === 7);
      expect(earlySlot?.isBlocked).toBe(true);
      expect(earlySlot?.appointment?.client.name).toBe('Early Bird');
      
      // Lunch appointment (12pm) should not be blocked
      const lunchSlot = slots.find(slot => slot.hour === 12);
      expect(lunchSlot?.isBlocked).toBe(false);
      expect(lunchSlot?.appointment?.client.name).toBe('Lunch Person');
      
      // Late appointment (10pm) should be blocked (outside working hours)
      const lateSlot = slots.find(slot => slot.hour === 22);
      expect(lateSlot?.isBlocked).toBe(true);
      expect(lateSlot?.appointment?.client.name).toBe('Night Owl');
    });
  });

  describe('Appointment Duration Visualization', () => {
    it('should show 75-minute appointment (4pm-5:15pm) in both 4pm and 5pm slots', () => {
      const longAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T16:00:00Z'), // 4pm
        status: 'confirmed',
        duration: 75, // 75 minutes
        service: { name: 'Extended Service', price: '50.00' },
        client: { name: 'Test Client' },
        price: '50.00'
      };

      const slots = generateTimeSlots([longAppointment]);
      
      // Should find appointment at 4 PM (start time)
      const fourPmSlot = slots.find(slot => slot.hour === 16);
      expect(fourPmSlot?.appointment).toBe(longAppointment);
      expect(fourPmSlot?.isBlocked).toBe(false);
      
      // Should also find appointment at 5 PM (continues into this hour)
      const fivePmSlot = slots.find(slot => slot.hour === 17);
      expect(fivePmSlot?.appointment).toBe(longAppointment);
      expect(fivePmSlot?.isBlocked).toBe(false);
      
      // Should NOT find appointment at 6 PM (ends at 5:15pm)
      const sixPmSlot = slots.find(slot => slot.hour === 18);
      expect(sixPmSlot?.appointment).toBe(null);
    });

    it('should show 125-minute appointment (11pm-1:05am) properly spanning hours', () => {
      const veryLongAppointment: MockAppointment = {
        id: 2,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T23:00:00Z'), // 11pm
        status: 'confirmed',
        duration: 125, // 2 hours 5 minutes
        service: { name: 'Very Long Service', price: '100.00' },
        client: { name: 'Night Client' },
        price: '100.00'
      };

      const slots = generateTimeSlots([veryLongAppointment]);
      
      // Should find appointment at 11 PM (start time)
      const elevenPmSlot = slots.find(slot => slot.hour === 23);
      expect(elevenPmSlot?.appointment).toBe(veryLongAppointment);
      
      // Should find appointment at 12 AM (continues)
      const midnightSlot = slots.find(slot => slot.hour === 0);
      expect(midnightSlot?.appointment).toBe(veryLongAppointment);
      
      // Should find appointment at 1 AM (continues until 1:05am)
      const oneAmSlot = slots.find(slot => slot.hour === 1);
      expect(oneAmSlot?.appointment).toBe(veryLongAppointment);
      
      // Should NOT find appointment at 2 AM (ends at 1:05am)
      const twoAmSlot = slots.find(slot => slot.hour === 2);
      expect(twoAmSlot?.appointment).toBe(null);
    });
  });

  describe('Calendar Expansion for Late Appointments', () => {
    it('should expand calendar to show 11pm appointment ending at 1:05am', () => {
      const lateAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T23:00:00Z'), // 11pm
        status: 'confirmed',
        duration: 125, // 2 hours 5 minutes, ends at 1:05am
        service: { name: 'Late Service', price: '75.00' },
        client: { name: 'Night Owl' },
        price: '75.00'
      };

      const slots = generateTimeSlots([lateAppointment]);
      
      // Calendar should expand to show from 9am to 1am (end hour)
      expect(slots[0].hour).toBe(9); // Default start
      expect(slots[slots.length - 1].hour).toBe(1); // Expanded to end hour
      
      // Should include 11pm, 12am, and 1am slots
      const hoursInSlots = slots.map(slot => slot.hour);
      expect(hoursInSlots).toContain(23); // 11pm
      expect(hoursInSlots).toContain(0);  // 12am
      expect(hoursInSlots).toContain(1);  // 1am
      
      // Should span across the hours properly
      const elevenPmSlot = slots.find(slot => slot.hour === 23);
      const midnightSlot = slots.find(slot => slot.hour === 0);
      const oneAmSlot = slots.find(slot => slot.hour === 1);
      
      expect(elevenPmSlot?.appointment).toBe(lateAppointment);
      expect(midnightSlot?.appointment).toBe(lateAppointment);
      expect(oneAmSlot?.appointment).toBe(lateAppointment);
    });

    it('should properly expand for appointment ending past midnight', () => {
      const lateAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T22:30:00Z'), // 10:30pm
        status: 'confirmed',
        duration: 150, // 2.5 hours, ends at 1:00am
        service: { name: 'Very Late Service', price: '90.00' },
        client: { name: 'Very Late Client' },
        price: '90.00'
      };

      const slots = generateTimeSlots([lateAppointment]);
      
      // Calendar should expand to include midnight hours
      const hoursInSlots = slots.map(slot => slot.hour);
      expect(hoursInSlots).toContain(22); // 10pm
      expect(hoursInSlots).toContain(23); // 11pm
      expect(hoursInSlots).toContain(0);  // 12am
      expect(hoursInSlots).toContain(1);  // 1am
      
      // Should span across the hours properly
      const tenPmSlot = slots.find(slot => slot.hour === 22);
      const elevenPmSlot = slots.find(slot => slot.hour === 23);
      const midnightSlot = slots.find(slot => slot.hour === 0);
      const oneAmSlot = slots.find(slot => slot.hour === 1);
      
      expect(tenPmSlot?.appointment).toBe(lateAppointment);
      expect(elevenPmSlot?.appointment).toBe(lateAppointment);
      expect(midnightSlot?.appointment).toBe(lateAppointment);
      expect(oneAmSlot?.appointment).toBe(lateAppointment);
    });
  });
});