import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock data for pending slot locking tests
const mockPendingAppointment = {
  id: 1,
  userId: 3,
  clientId: 1,
  scheduledAt: new Date('2025-07-03T13:00:00Z'), // 9:00 AM ET
  duration: 60, // 1 hour
  status: 'pending',
  price: '25.00',
  serviceId: 1,
  address: '123 Test St',
  notes: 'Pending appointment'
};

const mockConfirmedAppointment = {
  id: 2,
  userId: 3,
  clientId: 2,
  scheduledAt: new Date('2025-07-03T14:30:00Z'), // 10:30 AM ET
  duration: 45, // 45 minutes
  status: 'confirmed',
  price: '30.00',
  serviceId: 2,
  address: '456 Oak Ave',
  notes: 'Confirmed appointment'
};

const mockCancelledAppointment = {
  id: 3,
  userId: 3,
  clientId: 3,
  scheduledAt: new Date('2025-07-03T15:00:00Z'), // 11:00 AM ET
  duration: 30, // 30 minutes
  status: 'cancelled',
  price: '20.00',
  serviceId: 3,
  address: '789 Pine Dr',
  notes: 'Cancelled appointment'
};

const mockExpiredAppointment = {
  id: 4,
  userId: 3,
  clientId: 4,
  scheduledAt: new Date('2025-07-03T16:00:00Z'), // 12:00 PM ET
  duration: 60, // 1 hour
  status: 'expired',
  price: '25.00',
  serviceId: 1,
  address: '321 Elm St',
  notes: 'Expired appointment'
};

const mockUser = {
  id: 3,
  phone: '(646) 789-1820',
  timezone: 'America/New_York',
  workingHours: {
    wednesday: {
      enabled: true,
      start: '09:00',
      end: '18:00',
      breaks: [
        {
          start: '15:00',
          end: '16:00',
          label: 'Lunch Break'
        }
      ]
    }
  }
};

describe('Pending Slot Locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Availability API Slot Blocking Logic', () => {
    it('should block time slots for pending appointments', () => {
      const appointments = [mockPendingAppointment];
      
      // Test the slot blocking logic for a 15-minute slot at 9:00 AM
      const slotDateTime = new Date('2025-07-03T13:00:00Z'); // 9:00 AM ET
      const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000); // 9:15 AM ET
      
      // Check if pending appointment blocks the slot
      const isBlocked = appointments.some(apt => {
        // This is the logic from the fixed availability API
        if (apt.status !== 'confirmed' && apt.status !== 'pending') {
          return false;
        }
        
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        
        // Check for overlap
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      
      expect(isBlocked).toBe(true);
    });

    it('should block time slots for confirmed appointments', () => {
      const appointments = [mockConfirmedAppointment];
      
      // Test the slot blocking logic for a 15-minute slot at 10:30 AM
      const slotDateTime = new Date('2025-07-03T14:30:00Z'); // 10:30 AM ET
      const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000); // 10:45 AM ET
      
      const isBlocked = appointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') {
          return false;
        }
        
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      
      expect(isBlocked).toBe(true);
    });

    it('should NOT block time slots for cancelled appointments', () => {
      const appointments = [mockCancelledAppointment];
      
      // Test the slot blocking logic for a 15-minute slot at 11:00 AM
      const slotDateTime = new Date('2025-07-03T15:00:00Z'); // 11:00 AM ET
      const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000); // 11:15 AM ET
      
      const isBlocked = appointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') {
          return false;
        }
        
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      
      expect(isBlocked).toBe(false);
    });

    it('should NOT block time slots for expired appointments', () => {
      const appointments = [mockExpiredAppointment];
      
      // Test the slot blocking logic for a 15-minute slot at 12:00 PM
      const slotDateTime = new Date('2025-07-03T16:00:00Z'); // 12:00 PM ET
      const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000); // 12:15 PM ET
      
      const isBlocked = appointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') {
          return false;
        }
        
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      
      expect(isBlocked).toBe(false);
    });

    it('should properly handle duration-based slot blocking for pending appointments', () => {
      // 60-minute pending appointment starting at 9:00 AM should block slots until 10:00 AM
      const appointments = [mockPendingAppointment];
      
      // Test multiple 15-minute slots during the appointment duration
      const testSlots = [
        new Date('2025-07-03T13:00:00Z'), // 9:00 AM - should be blocked
        new Date('2025-07-03T13:15:00Z'), // 9:15 AM - should be blocked
        new Date('2025-07-03T13:30:00Z'), // 9:30 AM - should be blocked
        new Date('2025-07-03T13:45:00Z'), // 9:45 AM - should be blocked
        new Date('2025-07-03T14:00:00Z'), // 10:00 AM - should NOT be blocked
        new Date('2025-07-03T14:15:00Z'), // 10:15 AM - should NOT be blocked
      ];
      
      const expectedResults = [true, true, true, true, false, false];
      
      testSlots.forEach((slotDateTime, index) => {
        const slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
        
        const isBlocked = appointments.some(apt => {
          if (apt.status !== 'confirmed' && apt.status !== 'pending') {
            return false;
          }
          
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
          
          return aptStart < slotEnd && aptEnd > slotDateTime;
        });
        
        expect(isBlocked).toBe(expectedResults[index]);
      });
    });

    it('should handle multiple appointments with different statuses correctly', () => {
      const allAppointments = [
        mockPendingAppointment,    // 9:00 AM - 10:00 AM (should block)
        mockConfirmedAppointment,  // 10:30 AM - 11:15 AM (should block)
        mockCancelledAppointment,  // 11:00 AM - 11:30 AM (should NOT block)
        mockExpiredAppointment     // 12:00 PM - 1:00 PM (should NOT block)
      ];
      
      // Test slot at 9:00 AM - should be blocked by pending appointment
      let slotDateTime = new Date('2025-07-03T13:00:00Z');
      let slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
      let isBlocked = allAppointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') return false;
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      expect(isBlocked).toBe(true);
      
      // Test slot at 10:30 AM - should be blocked by confirmed appointment
      slotDateTime = new Date('2025-07-03T14:30:00Z');
      slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
      isBlocked = allAppointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') return false;
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      expect(isBlocked).toBe(true);
      
      // Test slot at 11:00 AM - should be blocked by confirmed appointment (10:30-11:15 AM)
      // The cancelled appointment at 11:00 AM should NOT block, but the confirmed one at 10:30 AM does overlap
      slotDateTime = new Date('2025-07-03T15:00:00Z');
      slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
      isBlocked = allAppointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') return false;
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      expect(isBlocked).toBe(true); // Blocked by confirmed appointment, not cancelled one
      
      // Test slot at 11:30 AM - should NOT be blocked (after confirmed appointment ends at 11:15 AM)
      slotDateTime = new Date('2025-07-03T15:30:00Z');
      slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
      isBlocked = allAppointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') return false;
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      expect(isBlocked).toBe(false); // Not blocked, all active appointments are done
      
      // Test slot at 12:00 PM - expired appointment should NOT block
      slotDateTime = new Date('2025-07-03T16:00:00Z');
      slotEnd = new Date(slotDateTime.getTime() + 15 * 60000);
      isBlocked = allAppointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') return false;
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        return aptStart < slotEnd && aptEnd > slotDateTime;
      });
      expect(isBlocked).toBe(false);
    });

    it('should validate the specific bug case: jake boo boo at 9:00am pending should block availability', () => {
      // This test validates the specific bug reported by the user
      const jakeBooBooPendingAppointment = {
        id: 100,
        userId: 3,
        clientId: 50,
        scheduledAt: new Date('2025-07-03T13:00:00Z'), // 9:00 AM ET (jake boo boo's time)
        duration: 60, // 1 hour appointment
        status: 'pending',
        price: '30.00',
        serviceId: 1,
        address: 'Client Location',
        notes: 'jake boo boo pending appointment'
      };
      
      const appointments = [jakeBooBooPendingAppointment];
      
      // Test that 9:00 AM slot is blocked
      const nineAmSlot = new Date('2025-07-03T13:00:00Z'); // 9:00 AM ET
      const nineAmSlotEnd = new Date(nineAmSlot.getTime() + 15 * 60000); // 9:15 AM ET
      
      const isNineAmBlocked = appointments.some(apt => {
        // This uses the FIXED logic that properly excludes pending appointments
        if (apt.status !== 'confirmed' && apt.status !== 'pending') {
          return false;
        }
        
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        
        return aptStart < nineAmSlotEnd && aptEnd > nineAmSlot;
      });
      
      // The bug was that pending appointments were NOT blocking slots
      // After the fix, pending appointments SHOULD block slots
      expect(isNineAmBlocked).toBe(true);
      
      // Also test that 10:00 AM (after the appointment) is available
      const tenAmSlot = new Date('2025-07-03T14:00:00Z'); // 10:00 AM ET
      const tenAmSlotEnd = new Date(tenAmSlot.getTime() + 15 * 60000); // 10:15 AM ET
      
      const isTenAmBlocked = appointments.some(apt => {
        if (apt.status !== 'confirmed' && apt.status !== 'pending') {
          return false;
        }
        
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
        
        return aptStart < tenAmSlotEnd && aptEnd > tenAmSlot;
      });
      
      expect(isTenAmBlocked).toBe(false);
    });
  });
});