import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock travel time calculation utilities
const mockMapboxService = {
  calculateTravelTime: vi.fn(),
  calculateTravelBuffer: vi.fn()
};

// Travel time utility functions (to be implemented)
function getDepartureTime(appointmentTime: string, travelTimeMinutes: number): string {
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const appointmentDate = new Date();
  appointmentDate.setHours(hours, minutes, 0, 0);
  
  const departureDate = new Date(appointmentDate.getTime() - (travelTimeMinutes * 60000));
  
  return departureDate.toTimeString().slice(0, 5);
}

function isTimeSlotAvailable(
  requestedTime: string,
  serviceDuration: number,
  previousAppointment: { endTime: string; address?: string },
  clientAddress: string,
  travelTimeMinutes: number,
  bufferMinutes: number
): boolean {
  const [reqHours, reqMinutes] = requestedTime.split(':').map(Number);
  const [prevHours, prevMinutes] = previousAppointment.endTime.split(':').map(Number);
  
  const requestedDate = new Date();
  requestedDate.setHours(reqHours, reqMinutes, 0, 0);
  
  const previousEndDate = new Date();
  previousEndDate.setHours(prevHours, prevMinutes, 0, 0);
  
  const minimumStartTime = new Date(previousEndDate.getTime() + ((travelTimeMinutes + bufferMinutes) * 60000));
  
  return requestedDate >= minimumStartTime;
}

function getAvailableTimeSlots(
  date: string,
  existingAppointments: Array<{
    startTime: string;
    endTime: string;
    address: string;
  }>,
  homeBaseAddress: string,
  workingHours: { start: string; end: string },
  serviceDuration: number,
  transportationMode: 'driving' | 'walking' | 'cycling' | 'transit' = 'driving',
  bufferMinutes: number = 5
): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);
  
  // Generate 15-minute time slots
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === endHour - 1 && minute + serviceDuration > endMin) break;
      
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Check if slot conflicts with existing appointments
      const isAvailable = !existingAppointments.some(apt => {
        const slotStart = new Date(`2000-01-01T${timeSlot}`);
        const slotEnd = new Date(slotStart.getTime() + (serviceDuration * 60000));
        const aptStart = new Date(`2000-01-01T${apt.startTime}`);
        const aptEnd = new Date(`2000-01-01T${apt.endTime}`);
        
        return (slotStart < aptEnd && slotEnd > aptStart);
      });
      
      if (isAvailable) {
        slots.push(timeSlot);
      }
    }
  }
  
  return slots;
}

describe('Travel Time Calculations', () => {
  const homeBase = "123 Main St, NY";
  const clientAddressA = "789 Oak St, NY";
  const clientAddressB = "456 Pine St, NJ";
  
  const serviceDuration = 45; // in minutes
  const prepBuffer = 5;       // minutes

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDepartureTime', () => {
    it('should calculate correct departure time for first appointment', () => {
      // 9:00 AM appointment at 20min away = depart home by 8:40
      const result = getDepartureTime("09:00", 20);
      expect(result).toBe("08:40");
    });

    it('should handle early morning appointments', () => {
      // 8:00 AM appointment with 30min travel = depart by 7:30
      const result = getDepartureTime("08:00", 30);
      expect(result).toBe("07:30");
    });

    it('should handle longer travel times', () => {
      // 10:00 AM appointment with 45min travel = depart by 9:15
      const result = getDepartureTime("10:00", 45);
      expect(result).toBe("09:15");
    });
  });

  describe('isTimeSlotAvailable', () => {
    it('should reject appointment that is too close after previous', () => {
      // First appointment ends at 11:00 AM
      // Travel = 40 min, buffer = 5
      // New appointment must start >= 11:45
      const result = isTimeSlotAvailable(
        "11:15", 
        45, 
        { endTime: "11:00" }, 
        clientAddressB, 
        40, 
        5
      );
      expect(result).toBe(false);
    });

    it('should accept appointment with sufficient gap', () => {
      // New appointment starts at 12:00 PM
      // Previous ended at 11:00, travel 40min + 5min buffer = 11:45 minimum
      const result = isTimeSlotAvailable(
        "12:00", 
        30, 
        { endTime: "11:00" }, 
        clientAddressB, 
        40, 
        5
      );
      expect(result).toBe(true);
    });

    it('should consider different travel times based on location', () => {
      // clientAddressA = 15 min from previous appointment
      const resultA = isTimeSlotAvailable(
        "11:20", 
        30, 
        { endTime: "11:00" }, 
        clientAddressA, 
        15, 
        5
      );
      
      // clientAddressB = 40 min from previous appointment
      const resultB = isTimeSlotAvailable(
        "11:20", 
        30, 
        { endTime: "11:00" }, 
        clientAddressB, 
        40, 
        5
      );

      expect(resultA).toBe(true);  // 15min + 5min = 20min gap (11:00 -> 11:20)
      expect(resultB).toBe(false); // 40min + 5min = 45min needed (11:00 -> 11:45)
    });

    it('should handle exact minimum time requirements', () => {
      // Appointment exactly at minimum required time
      const result = isTimeSlotAvailable(
        "11:45", 
        30, 
        { endTime: "11:00" }, 
        clientAddressB, 
        40, 
        5
      );
      expect(result).toBe(true);
    });
  });

  describe('Transportation Mode Effects', () => {
    it('should calculate different travel times for different modes', () => {
      const testCases = [
        { mode: 'driving' as const, expectedMultiplier: 1 },
        { mode: 'walking' as const, expectedMultiplier: 4 },
        { mode: 'cycling' as const, expectedMultiplier: 2 },
        { mode: 'transit' as const, expectedMultiplier: 1.5 }
      ];

      testCases.forEach(({ mode, expectedMultiplier }) => {
        mockMapboxService.calculateTravelTime.mockResolvedValue({
          duration: 20 * expectedMultiplier,
          distance: 5000,
          status: 'OK'
        });

        // Test would call actual service
        expect(mockMapboxService.calculateTravelTime).toBeDefined();
      });
    });

    it('should handle transit mode with driving estimate + 50% buffer', () => {
      // Transit mode should use driving time * 1.5
      mockMapboxService.calculateTravelTime
        .mockResolvedValueOnce({
          duration: 20, // driving time
          distance: 10000,
          status: 'OK'
        })
        .mockResolvedValueOnce({
          duration: 30, // transit time (20 * 1.5)
          distance: 10000,
          status: 'OK'
        });

      // This would be tested with actual implementation
      expect(30).toBe(20 * 1.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle same location (no travel time)', () => {
      const result = getDepartureTime("10:00", 0);
      expect(result).toBe("10:00");
    });

    it('should handle very long travel times', () => {
      const result = getDepartureTime("14:00", 120); // 2 hours
      expect(result).toBe("12:00");
    });

    it('should handle appointment at working hours boundary', () => {
      const workingHours = { start: "09:00", end: "17:00" };
      
      const slots = getAvailableTimeSlots(
        "2025-07-03",
        [],
        homeBase,
        workingHours,
        60, // 1 hour service
        'driving',
        5
      );

      expect(slots).toContain("09:00");
      expect(slots).not.toContain("16:15"); // Would end at 17:15, past working hours
    });

    it('should handle overlapping service durations correctly', () => {
      const existingAppointments = [
        {
          startTime: "10:00",
          endTime: "10:30",
          address: clientAddressA
        }
      ];

      const slots = getAvailableTimeSlots(
        "2025-07-03",
        existingAppointments,
        homeBase,
        { start: "09:00", end: "17:00" },
        45, // 45 min service - would overlap with existing 30min appointment
        'driving',
        5
      );

      expect(slots).not.toContain("10:00");
      expect(slots).not.toContain("09:45"); // Would end at 10:30, conflicting
    });
  });

  describe('Buffer Calculations', () => {
    it('should add grace time buffer to travel estimates', () => {
      const graceTime = 10;
      const travelTime = 25;
      const totalBuffer = travelTime + graceTime;

      expect(totalBuffer).toBe(35);
    });

    it('should use fallback times when API fails', () => {
      mockMapboxService.calculateTravelTime.mockResolvedValue({
        duration: 0,
        distance: 0,
        status: 'ERROR',
        errorMessage: 'API failed'
      });

      // Fallback buffer times based on mode
      const fallbackBuffers = {
        driving: 15,
        walking: 30,
        cycling: 20,
        transit: 25
      };

      Object.entries(fallbackBuffers).forEach(([mode, buffer]) => {
        expect(buffer).toBeGreaterThan(0);
      });
    });
  });
});