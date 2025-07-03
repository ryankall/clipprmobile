import { describe, it, expect } from 'vitest';

// Simple functional tests to verify test setup works
describe('Clippr App Functionality Tests', () => {
  describe('Basic App Structure', () => {
    it('should have proper test environment setup', () => {
      expect(typeof window).toBe('object');
      expect(typeof document).toBe('object');
    });

    it('should validate appointment data structure', () => {
      const appointment = {
        id: 1,
        clientName: 'John Doe',
        serviceName: 'Haircut',
        scheduledAt: new Date('2025-07-03T14:00:00Z'),
        duration: 45,
        price: '35.00',
        status: 'confirmed'
      };

      expect(appointment.id).toBeGreaterThan(0);
      expect(appointment.clientName).toBeTruthy();
      expect(appointment.serviceName).toBeTruthy();
      expect(appointment.scheduledAt).toBeInstanceOf(Date);
      expect(appointment.duration).toBeGreaterThan(0);
      expect(parseFloat(appointment.price)).toBeGreaterThan(0);
      expect(['pending', 'confirmed', 'cancelled', 'no_show', 'expired']).toContain(appointment.status);
    });

    it('should validate client data structure', () => {
      const client = {
        id: 1,
        name: 'John Doe',
        phone: '(555) 123-4567',
        email: 'john@example.com',
        loyaltyStatus: 'gold',
        totalVisits: 10
      };

      expect(client.id).toBeGreaterThan(0);
      expect(client.name).toBeTruthy();
      expect(client.phone).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
      expect(client.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(['new', 'regular', 'gold', 'vip']).toContain(client.loyaltyStatus);
      expect(client.totalVisits).toBeGreaterThanOrEqual(0);
    });

    it('should validate service data structure', () => {
      const service = {
        id: 1,
        name: 'Haircut',
        description: 'Classic haircut and styling',
        price: '35.00',
        duration: 45,
        category: 'Haircuts',
        isActive: true
      };

      expect(service.id).toBeGreaterThan(0);
      expect(service.name).toBeTruthy();
      expect(service.description).toBeTruthy();
      expect(parseFloat(service.price)).toBeGreaterThan(0);
      expect(service.duration).toBeGreaterThan(0);
      expect(['Haircuts', 'Beard Services', 'Combinations', 'Custom']).toContain(service.category);
      expect(typeof service.isActive).toBe('boolean');
    });

    it('should validate working hours structure', () => {
      const workingHours = {
        monday: { start: '09:00', end: '18:00', enabled: true },
        tuesday: { start: '09:00', end: '18:00', enabled: true },
        wednesday: { start: '09:00', end: '18:00', enabled: true, breaks: [{ start: '12:00', end: '13:00', label: 'Lunch' }] },
        thursday: { start: '09:00', end: '18:00', enabled: true },
        friday: { start: '09:00', end: '18:00', enabled: true },
        saturday: { start: '10:00', end: '16:00', enabled: false },
        sunday: { start: '10:00', end: '16:00', enabled: false }
      };

      Object.values(workingHours).forEach(day => {
        expect(day.start).toMatch(/^\d{2}:\d{2}$/);
        expect(day.end).toMatch(/^\d{2}:\d{2}$/);
        expect(typeof day.enabled).toBe('boolean');
        
        if (day.breaks) {
          day.breaks.forEach(breakPeriod => {
            expect(breakPeriod.start).toMatch(/^\d{2}:\d{2}$/);
            expect(breakPeriod.end).toMatch(/^\d{2}:\d{2}$/);
            expect(breakPeriod.label).toBeTruthy();
          });
        }
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should correctly calculate appointment end time', () => {
      const startTime = new Date('2025-07-03T14:00:00Z');
      const duration = 45; // minutes
      const expectedEndTime = new Date('2025-07-03T14:45:00Z');
      
      const calculatedEndTime = new Date(startTime.getTime() + duration * 60 * 1000);
      
      expect(calculatedEndTime.getTime()).toBe(expectedEndTime.getTime());
    });

    it('should detect appointment overlaps correctly', () => {
      const appointment1 = {
        start: new Date('2025-07-03T14:00:00Z'),
        end: new Date('2025-07-03T14:45:00Z')
      };
      
      const appointment2 = {
        start: new Date('2025-07-03T14:30:00Z'),
        end: new Date('2025-07-03T15:15:00Z')
      };
      
      const noOverlap = {
        start: new Date('2025-07-03T15:30:00Z'),
        end: new Date('2025-07-03T16:15:00Z')
      };

      // Check overlap logic: apt1 overlaps apt2 if apt1.start < apt2.end AND apt1.end > apt2.start
      const hasOverlap = appointment1.start < appointment2.end && appointment1.end > appointment2.start;
      const noOverlapCheck = appointment1.start < noOverlap.end && appointment1.end > noOverlap.start;
      
      expect(hasOverlap).toBe(true);
      expect(noOverlapCheck).toBe(false);
    });

    it('should validate phone number formats', () => {
      const validPhones = [
        '(555) 123-4567',
        '(123) 456-7890',
        '(999) 888-7777'
      ];
      
      const invalidPhones = [
        '555-123-4567',
        '5551234567',
        '555.123.4567',
        'invalid'
      ];
      
      const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;
      
      validPhones.forEach(phone => {
        expect(phone).toMatch(phonePattern);
      });
      
      invalidPhones.forEach(phone => {
        expect(phone).not.toMatch(phonePattern);
      });
    });

    it('should calculate service pricing correctly', () => {
      const services = [
        { name: 'Haircut', price: '35.00', quantity: 1 },
        { name: 'Beard Trim', price: '20.00', quantity: 1 },
        { name: 'Styling', price: '15.00', quantity: 2 }
      ];
      
      const totalPrice = services.reduce((sum, service) => {
        return sum + (parseFloat(service.price) * service.quantity);
      }, 0);
      
      expect(totalPrice).toBe(85.00); // 35 + 20 + (15 * 2)
    });

    it('should validate timezone handling', () => {
      const utcTime = new Date('2025-07-03T19:00:00Z'); // 7 PM UTC
      
      // Basic timezone validation
      expect(utcTime.getUTCHours()).toBe(19);
      
      // Test that timezone conversion works (exact time may vary by DST)
      const easternTimeString = utcTime.toLocaleTimeString('en-US', { 
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      });
      
      // Should contain PM and be a valid time format
      expect(easternTimeString).toMatch(/\d{1,2}:\d{2}.*PM/);
    });
  });

  describe('Dashboard Statistics', () => {
    it('should calculate daily earnings correctly', () => {
      const appointments = [
        { price: '35.00', status: 'confirmed' },
        { price: '20.00', status: 'confirmed' },
        { price: '25.00', status: 'pending' }, // Should not count
        { price: '15.00', status: 'confirmed' }
      ];
      
      const dailyEarnings = appointments
        .filter(apt => apt.status === 'confirmed')
        .reduce((sum, apt) => sum + parseFloat(apt.price), 0);
      
      expect(dailyEarnings).toBe(70.00);
    });

    it('should count appointments correctly by status', () => {
      const appointments = [
        { status: 'confirmed' },
        { status: 'confirmed' },
        { status: 'pending' },
        { status: 'cancelled' },
        { status: 'confirmed' }
      ];
      
      const confirmedCount = appointments.filter(apt => apt.status === 'confirmed').length;
      const pendingCount = appointments.filter(apt => apt.status === 'pending').length;
      
      expect(confirmedCount).toBe(3);
      expect(pendingCount).toBe(1);
    });
  });
});