import { describe, it, expect } from 'vitest';

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

// Simplified time slot generator for testing appointment duration
function generateSimpleTimeSlots(appointments: MockAppointment[]): Array<{
  time: string;
  hour: number;
  appointment: MockAppointment | null;
}> {
  const slots: Array<{
    time: string;
    hour: number;
    appointment: MockAppointment | null;
  }> = [];
  
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  
  // Determine range based on appointments
  if (sortedAppointments.length === 0) return [];
  
  let startHour = Number.MAX_SAFE_INTEGER;
  let endHour = Number.MIN_SAFE_INTEGER;
  
  // Calculate proper start and end hours including appointment durations
  for (const apt of sortedAppointments) {
    const aptStart = new Date(apt.scheduledAt);
    const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
    
    const aptStartHour = aptStart.getUTCHours();
    const aptEndHour = aptEnd.getUTCHours();
    
    startHour = Math.min(startHour, aptStartHour);
    
    // For end hour, we need the hour that contains the end time
    // If appointment ends exactly on the hour, don't include that hour
    // If appointment ends after the hour starts, include that hour
    if (aptEnd.getUTCMinutes() > 0) {
      endHour = Math.max(endHour, aptEndHour);
    } else {
      // Ends exactly on the hour, so don't include that hour
      endHour = Math.max(endHour, aptEndHour - 1);
    }
  }
  
  // Handle midnight crossover for appointments that span past midnight
  const needsMidnightHandling = sortedAppointments.some(apt => {
    const aptStart = new Date(apt.scheduledAt);
    const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
    return aptEnd.getUTCDate() !== aptStart.getUTCDate();
  });
  
  // If any appointment crosses midnight, we need to handle hour wraparound
  if (needsMidnightHandling) {
    // Find the latest end hour considering midnight crossover
    let maxEndHour = endHour;
    for (const apt of sortedAppointments) {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
      
      if (aptEnd.getUTCDate() !== aptStart.getUTCDate()) {
        // Appointment crosses midnight
        const nextDayEndHour = aptEnd.getUTCHours();
        if (aptEnd.getUTCMinutes() > 0) {
          maxEndHour = Math.max(maxEndHour, nextDayEndHour);
        } else {
          maxEndHour = Math.max(maxEndHour, nextDayEndHour - 1);
        }
      }
    }
    endHour = maxEndHour;
  }
  
  // Generate time slots
  let hoursToGenerate: number[] = [];
  
  if (needsMidnightHandling) {
    // For midnight crossover, generate hours from start to 23, then 0 to end
    for (let h = startHour; h <= 23; h++) {
      hoursToGenerate.push(h);
    }
    for (let h = 0; h <= endHour; h++) {
      hoursToGenerate.push(h);
    }
  } else {
    // Normal case, generate from start to end
    for (let h = startHour; h <= endHour; h++) {
      hoursToGenerate.push(h);
    }
  }
  
  for (const hour of hoursToGenerate) {
    const actualHour = hour % 24; // Handle hour overflow past 24
    const timeStr = actualHour === 0 ? '12 AM' : actualHour === 12 ? '12 PM' : actualHour < 12 ? `${actualHour} AM` : `${actualHour - 12} PM`;
    
    // Check if there's an appointment that overlaps this hour
    const appointment = sortedAppointments.find(apt => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
      
      // Create hour boundaries for current slot (same date as appointment start)
      const slotStart = new Date(aptStart);
      slotStart.setUTCHours(actualHour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setUTCHours(actualHour + 1, 0, 0, 0);
      
      // Handle midnight crossover: if slot hour is earlier than appointment start hour,
      // it means we're in the next day
      if (actualHour < aptStart.getUTCHours() && needsMidnightHandling) {
        slotStart.setUTCDate(slotStart.getUTCDate() + 1);
        slotEnd.setUTCDate(slotEnd.getUTCDate() + 1);
      }
      
      // Check if appointment overlaps with this time slot
      return aptStart < slotEnd && aptEnd > slotStart;
    });
    
    slots.push({
      time: timeStr,
      hour: actualHour,
      appointment: appointment || null
    });
  }
  
  return slots;
}

describe('Appointment Duration Visualization Tests', () => {
  describe('75-minute appointment (4pm-5:15pm)', () => {
    it('should appear in both 4pm and 5pm time slots', () => {
      const appointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T16:00:00Z'), // 4pm UTC
        status: 'confirmed',
        duration: 75, // 75 minutes (1 hour 15 minutes)
        service: { name: 'Extended Cut', price: '50.00' },
        client: { name: 'Test Client' },
        price: '50.00'
      };

      const slots = generateSimpleTimeSlots([appointment]);
      
      // Should have slots for 4pm, 5pm (ends at 5:15pm so includes 5pm hour)
      expect(slots).toHaveLength(2);
      
      // 4pm slot should have the appointment
      const fourPmSlot = slots.find(slot => slot.hour === 16);
      expect(fourPmSlot).toBeDefined();
      expect(fourPmSlot!.appointment).toBe(appointment);
      
      // 5pm slot should also have the appointment (continues into this hour)
      const fivePmSlot = slots.find(slot => slot.hour === 17);
      expect(fivePmSlot).toBeDefined();
      expect(fivePmSlot!.appointment).toBe(appointment);
    });
  });

  describe('125-minute appointment (11pm-1:05am)', () => {
    it('should appear in 11pm, 12am, and 1am time slots', () => {
      const appointment: MockAppointment = {
        id: 2,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T23:00:00Z'), // 11pm UTC
        status: 'confirmed',
        duration: 125, // 125 minutes (2 hours 5 minutes)
        service: { name: 'Very Long Service', price: '100.00' },
        client: { name: 'Night Client' },
        price: '100.00'
      };

      const slots = generateSimpleTimeSlots([appointment]);
      
      // Should expand from 23 (11pm) to 1 (1am) = 3 hours
      expect(slots).toHaveLength(3);
      expect(slots[0].hour).toBe(23); // 11pm
      expect(slots[2].hour).toBe(1);  // 1am
      
      // 11pm slot should have the appointment
      const elevenPmSlot = slots.find(slot => slot.hour === 23);
      expect(elevenPmSlot!.appointment).toBe(appointment);
      
      // 12am slot should have the appointment  
      const midnightSlot = slots.find(slot => slot.hour === 0);
      expect(midnightSlot!.appointment).toBe(appointment);
      
      // 1am slot should have the appointment (until 1:05am)
      const oneAmSlot = slots.find(slot => slot.hour === 1);
      expect(oneAmSlot!.appointment).toBe(appointment);
    });
  });

  describe('Calendar expansion for late appointments', () => {
    it('should expand calendar to include appointment end time', () => {
      const lateAppointment: MockAppointment = {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date('2025-07-05T22:30:00Z'), // 10:30pm UTC
        status: 'confirmed',
        duration: 155, // 2 hours 35 minutes, ends at 1:05am next day
        service: { name: 'Very Late Service', price: '90.00' },
        client: { name: 'Very Late Client' },
        price: '90.00'
      };

      const slots = generateSimpleTimeSlots([lateAppointment]);
      
      // Should include hours 22, 23, 0, 1
      const hoursInSlots = slots.map(slot => slot.hour);
      expect(hoursInSlots).toContain(22); // 10pm
      expect(hoursInSlots).toContain(23); // 11pm  
      expect(hoursInSlots).toContain(0);  // 12am
      expect(hoursInSlots).toContain(1);  // 1am
      
      // All slots should have the appointment
      slots.forEach(slot => {
        expect(slot.appointment).toBe(lateAppointment);
      });
    });
  });
});