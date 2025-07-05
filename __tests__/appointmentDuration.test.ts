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
  
  let startHour = sortedAppointments[0].scheduledAt.getUTCHours();
  let endHour = startHour;
  
  for (const apt of sortedAppointments) {
    const aptStart = new Date(apt.scheduledAt);
    const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
    
    const aptStartHour = aptStart.getUTCHours();
    const aptEndHour = aptEnd.getUTCHours();
    
    if (aptStartHour < startHour) startHour = aptStartHour;
    if (aptEndHour >= endHour) endHour = aptEndHour;
  }
  
  // Handle midnight crossover
  if (endHour < startHour) {
    // Appointment crosses midnight
    endHour += 24;
  }
  
  // Generate time slots
  for (let hour = startHour; hour <= endHour; hour++) {
    const actualHour = hour % 24; // Handle hour overflow past 24
    const timeStr = actualHour === 0 ? '12 AM' : actualHour === 12 ? '12 PM' : actualHour < 12 ? `${actualHour} AM` : `${actualHour - 12} PM`;
    
    // Check if there's an appointment that overlaps this hour
    const appointment = sortedAppointments.find(apt => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 0) * 60 * 1000);
      
      const aptStartHour = aptStart.getUTCHours();
      const aptEndHour = aptEnd.getUTCHours();
      
      // Handle midnight crossover
      let adjustedEndHour = aptEndHour;
      if (aptEndHour < aptStartHour) {
        adjustedEndHour += 24;
      }
      
      // Check if current hour (potentially adjusted) overlaps with appointment
      let adjustedCurrentHour = actualHour;
      if (actualHour < aptStartHour && hour > startHour) {
        adjustedCurrentHour += 24;
      }
      
      // Appointment spans into this hour if it starts at or before this hour
      // and ends after this hour starts
      return aptStartHour <= adjustedCurrentHour && adjustedCurrentHour < adjustedEndHour;
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
        duration: 150, // 2.5 hours, ends at 1:00am next day
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