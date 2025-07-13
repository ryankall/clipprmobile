import { describe, it, expect, beforeEach } from 'vitest';

// Types for mobile calendar system
interface MobileAppointment {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: Date;
  status: 'confirmed' | 'pending' | 'cancelled' | 'expired';
  duration: number;
  client?: { name: string; phone: string };
  service?: { name: string; price: string };
  price: string;
  travelRequired?: boolean;
  address?: string;
}

interface MobileTimeSlot {
  hour: number;
  time: string;
  appointments: MobileAppointment[];
  isBlocked: boolean;
  isCurrentHour: boolean;
  mobileOptimized: boolean;
}

interface MobileWorkingHours {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
}

interface MobileCalendarView {
  date: Date;
  timeSlots: MobileTimeSlot[];
  workingHours: MobileWorkingHours;
  viewMode: 'week' | 'day' | 'list';
  mobileLayout: boolean;
}

// Mock mobile calendar service
class MockMobileCalendarService {
  private appointments: MobileAppointment[] = [];
  private workingHours: MobileWorkingHours;
  private nextId = 1;

  constructor() {
    this.workingHours = {
      monday: { start: '09:00', end: '18:00', enabled: true },
      tuesday: { start: '09:00', end: '18:00', enabled: true },
      wednesday: { start: '09:00', end: '18:00', enabled: true },
      thursday: { start: '09:00', end: '18:00', enabled: true },
      friday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '10:00', end: '16:00', enabled: true },
      sunday: { start: '12:00', end: '17:00', enabled: false }
    };
    this.setupMockData();
  }

  private setupMockData(): void {
    const today = new Date();
    
    // Add test mobile appointments
    this.appointments = [
      {
        id: 1,
        userId: 1,
        clientId: 1,
        scheduledAt: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        status: 'confirmed',
        duration: 45,
        client: { name: 'Mobile Client A', phone: '(555) 111-1111' },
        service: { name: 'Mobile Cut', price: '30.00' },
        price: '30.00',
        travelRequired: true,
        address: '123 Mobile St'
      },
      {
        id: 2,
        userId: 1,
        clientId: 2,
        scheduledAt: new Date(today.getTime() + 4 * 60 * 60 * 1000), // 4 hours from now
        status: 'pending',
        duration: 30,
        client: { name: 'Mobile Client B', phone: '(555) 222-2222' },
        service: { name: 'Mobile Trim', price: '25.00' },
        price: '25.00',
        travelRequired: false
      }
    ];
    this.nextId = 3;
  }

  generateMobileTimeSlots(date: Date, startHour: number = 6, endHour: number = 22): MobileTimeSlot[] {
    const timeSlots: MobileTimeSlot[] = [];
    const currentTime = new Date();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' }) as keyof MobileWorkingHours;
    const dayWorkingHours = this.workingHours[dayName];

    for (let hour = startHour; hour <= endHour; hour++) {
      const timeString = this.formatMobileHour(hour);
      const isCurrentHour = date.toDateString() === currentTime.toDateString() && hour === currentTime.getHours();
      const isWithinWorkingHours = this.isMobileHourInWorkingRange(hour, dayWorkingHours);
      
      // Get appointments for this hour
      const hourAppointments = this.getMobileAppointmentsForHour(date, hour);

      const timeSlot: MobileTimeSlot = {
        hour,
        time: timeString,
        appointments: hourAppointments,
        isBlocked: !isWithinWorkingHours,
        isCurrentHour,
        mobileOptimized: true
      };

      timeSlots.push(timeSlot);
    }

    return timeSlots;
  }

  private formatMobileHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  private isMobileHourInWorkingRange(hour: number, workingHours: { start: string; end: string; enabled: boolean }): boolean {
    if (!workingHours.enabled) return false;

    const startHour = parseInt(workingHours.start.split(':')[0]);
    const endHour = parseInt(workingHours.end.split(':')[0]);
    
    return hour >= startHour && hour < endHour;
  }

  private getMobileAppointmentsForHour(date: Date, hour: number): MobileAppointment[] {
    return this.appointments.filter(apt => {
      const aptDate = apt.scheduledAt;
      return aptDate.toDateString() === date.toDateString() && 
             aptDate.getHours() === hour;
    });
  }

  createMobileCalendarView(date: Date, viewMode: 'week' | 'day' | 'list' = 'day'): MobileCalendarView {
    const timeSlots = this.generateMobileTimeSlots(date);

    return {
      date,
      timeSlots,
      workingHours: this.workingHours,
      viewMode,
      mobileLayout: true
    };
  }

  getMobileAppointmentsForDate(date: Date): MobileAppointment[] {
    return this.appointments.filter(apt => 
      apt.scheduledAt.toDateString() === date.toDateString()
    );
  }

  updateMobileWorkingHours(day: keyof MobileWorkingHours, hours: { start: string; end: string; enabled: boolean }): void {
    this.workingHours[day] = hours;
  }

  addMobileAppointment(appointmentData: {
    scheduledAt: Date;
    duration: number;
    clientName: string;
    serviceName: string;
    price: string;
    travelRequired?: boolean;
    address?: string;
  }): MobileAppointment {
    const appointment: MobileAppointment = {
      id: this.nextId++,
      userId: 1,
      clientId: 1,
      scheduledAt: appointmentData.scheduledAt,
      status: 'confirmed',
      duration: appointmentData.duration,
      client: { name: appointmentData.clientName, phone: '(555) 000-0000' },
      service: { name: appointmentData.serviceName, price: appointmentData.price },
      price: appointmentData.price,
      travelRequired: appointmentData.travelRequired,
      address: appointmentData.address
    };

    this.appointments.push(appointment);
    return appointment;
  }

  detectMobileOverlaps(date: Date): MobileAppointment[] {
    const dayAppointments = this.getMobileAppointmentsForDate(date);
    const overlaps: MobileAppointment[] = [];

    for (let i = 0; i < dayAppointments.length; i++) {
      for (let j = i + 1; j < dayAppointments.length; j++) {
        const apt1 = dayAppointments[i];
        const apt2 = dayAppointments[j];

        const apt1End = new Date(apt1.scheduledAt.getTime() + apt1.duration * 60000);
        const apt2End = new Date(apt2.scheduledAt.getTime() + apt2.duration * 60000);

        // Check for mobile appointment overlap
        if (apt1.scheduledAt < apt2End && apt2.scheduledAt < apt1End) {
          if (!overlaps.includes(apt1)) overlaps.push(apt1);
          if (!overlaps.includes(apt2)) overlaps.push(apt2);
        }
      }
    }

    return overlaps;
  }

  getMobileCurrentTimePosition(): { hour: number; minutes: number; percentage: number } {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const percentage = (minutes / 60) * 100;

    return { hour, minutes, percentage };
  }

  filterMobileAppointmentsByStatus(appointments: MobileAppointment[], status: string): MobileAppointment[] {
    return appointments.filter(apt => apt.status === status);
  }

  getMobileTravelAppointments(date: Date): MobileAppointment[] {
    const dayAppointments = this.getMobileAppointmentsForDate(date);
    return dayAppointments.filter(apt => apt.travelRequired);
  }

  calculateMobileDayEarnings(date: Date): number {
    const dayAppointments = this.getMobileAppointmentsForDate(date);
    const confirmedAppointments = dayAppointments.filter(apt => apt.status === 'confirmed');
    
    return confirmedAppointments.reduce((total, apt) => {
      return total + parseFloat(apt.price);
    }, 0);
  }

  // Test helper methods
  clearMobileAppointments(): void {
    this.appointments = [];
    this.nextId = 1;
  }

  getMobileAppointments(): MobileAppointment[] {
    return this.appointments;
  }

  setMobileTestTime(hour: number, minutes: number = 0): void {
    // Mock method to set current time for testing
    const testTime = new Date();
    testTime.setHours(hour, minutes, 0, 0);
    // In a real implementation, this would affect time-based calculations
  }
}

describe('Mobile Calendar Features', () => {
  let mobileCalendarService: MockMobileCalendarService;

  beforeEach(() => {
    mobileCalendarService = new MockMobileCalendarService();
    mobileCalendarService.clearMobileAppointments();
  });

  describe('Mobile Time Slot Generation', () => {
    it('should generate mobile-optimized time slots for a day', () => {
      const testDate = new Date('2025-07-16T00:00:00');
      const timeSlots = mobileCalendarService.generateMobileTimeSlots(testDate, 8, 20);

      expect(timeSlots.length).toBe(13); // 8 AM to 8 PM = 13 hours
      expect(timeSlots.every(slot => slot.mobileOptimized)).toBe(true);
      expect(timeSlots[0].hour).toBe(8);
      expect(timeSlots[0].time).toBe('8:00 AM');
      expect(timeSlots[12].hour).toBe(20);
      expect(timeSlots[12].time).toBe('8:00 PM');
    });

    it('should properly format mobile time display', () => {
      const testDate = new Date('2025-07-16T00:00:00');
      const timeSlots = mobileCalendarService.generateMobileTimeSlots(testDate, 0, 23);

      expect(timeSlots.find(slot => slot.hour === 0)?.time).toBe('12:00 AM');
      expect(timeSlots.find(slot => slot.hour === 12)?.time).toBe('12:00 PM');
      expect(timeSlots.find(slot => slot.hour === 13)?.time).toBe('1:00 PM');
      expect(timeSlots.find(slot => slot.hour === 23)?.time).toBe('11:00 PM');
    });

    it('should identify current hour for mobile display', () => {
      const now = new Date();
      const timeSlots = mobileCalendarService.generateMobileTimeSlots(now);

      const currentHourSlot = timeSlots.find(slot => slot.isCurrentHour);
      expect(currentHourSlot?.hour).toBe(now.getHours());
    });
  });

  describe('Mobile Working Hours Integration', () => {
    it('should respect mobile working hours for blocking', () => {
      const testDate = new Date('2025-07-16T00:00:00'); // Wednesday
      const timeSlots = mobileCalendarService.generateMobileTimeSlots(testDate, 6, 22);

      // Check hours before working hours (6-8 AM)
      const earlySlots = timeSlots.filter(slot => slot.hour < 9);
      expect(earlySlots.every(slot => slot.isBlocked)).toBe(true);

      // Check working hours (9 AM - 6 PM)
      const workingSlots = timeSlots.filter(slot => slot.hour >= 9 && slot.hour < 18);
      expect(workingSlots.every(slot => !slot.isBlocked)).toBe(true);

      // Check hours after working hours (6 PM+)
      const lateSlots = timeSlots.filter(slot => slot.hour >= 18);
      expect(lateSlots.every(slot => slot.isBlocked)).toBe(true);
    });

    it('should handle mobile Sunday working hours (disabled by default)', () => {
      const sundayDate = new Date('2025-07-20T00:00:00'); // Sunday
      const timeSlots = mobileCalendarService.generateMobileTimeSlots(sundayDate);

      // All Sunday slots should be blocked since Sunday is disabled
      expect(timeSlots.every(slot => slot.isBlocked)).toBe(true);
    });

    it('should allow mobile working hours updates', () => {
      mobileCalendarService.updateMobileWorkingHours('sunday', {
        start: '10:00',
        end: '15:00',
        enabled: true
      });

      const sundayDate = new Date('2025-07-20T00:00:00');
      const timeSlots = mobileCalendarService.generateMobileTimeSlots(sundayDate);

      const workingSlots = timeSlots.filter(slot => slot.hour >= 10 && slot.hour < 15);
      expect(workingSlots.every(slot => !slot.isBlocked)).toBe(true);

      const nonWorkingSlots = timeSlots.filter(slot => slot.hour < 10 || slot.hour >= 15);
      expect(nonWorkingSlots.every(slot => slot.isBlocked)).toBe(true);
    });
  });

  describe('Mobile Calendar View Creation', () => {
    it('should create mobile-optimized calendar view', () => {
      const testDate = new Date('2025-07-16T00:00:00');
      const calendarView = mobileCalendarService.createMobileCalendarView(testDate, 'day');

      expect(calendarView.mobileLayout).toBe(true);
      expect(calendarView.viewMode).toBe('day');
      expect(calendarView.date).toEqual(testDate);
      expect(calendarView.timeSlots.length).toBeGreaterThan(0);
      expect(calendarView.timeSlots.every(slot => slot.mobileOptimized)).toBe(true);
    });

    it('should support different mobile view modes', () => {
      const testDate = new Date('2025-07-16T00:00:00');
      
      const dayView = mobileCalendarService.createMobileCalendarView(testDate, 'day');
      const weekView = mobileCalendarService.createMobileCalendarView(testDate, 'week');
      const listView = mobileCalendarService.createMobileCalendarView(testDate, 'list');

      expect(dayView.viewMode).toBe('day');
      expect(weekView.viewMode).toBe('week');
      expect(listView.viewMode).toBe('list');
      expect([dayView, weekView, listView].every(view => view.mobileLayout)).toBe(true);
    });
  });

  describe('Mobile Appointment Integration', () => {
    it('should include mobile appointments in time slots', () => {
      const testDate = new Date('2025-07-16T14:00:00'); // 2 PM
      const appointment = mobileCalendarService.addMobileAppointment({
        scheduledAt: testDate,
        duration: 45,
        clientName: 'Mobile Test Client',
        serviceName: 'Mobile Service',
        price: '40.00',
        travelRequired: true,
        address: '123 Mobile Ave'
      });

      const timeSlots = mobileCalendarService.generateMobileTimeSlots(testDate);
      const appointmentSlot = timeSlots.find(slot => slot.hour === 14);

      expect(appointmentSlot?.appointments.length).toBe(1);
      expect(appointmentSlot?.appointments[0].id).toBe(appointment.id);
      expect(appointmentSlot?.appointments[0].travelRequired).toBe(true);
    });

    it('should detect mobile appointment overlaps', () => {
      const testDate = new Date('2025-07-16T00:00:00');
      
      // Add overlapping mobile appointments
      mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T14:00:00'),
        duration: 60,
        clientName: 'Client A',
        serviceName: 'Service A',
        price: '50.00'
      });

      mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T14:30:00'),
        duration: 45,
        clientName: 'Client B',
        serviceName: 'Service B',
        price: '40.00'
      });

      const overlaps = mobileCalendarService.detectMobileOverlaps(testDate);
      expect(overlaps.length).toBe(2);
    });

    it('should filter mobile appointments by status', () => {
      const testDate = new Date('2025-07-16T00:00:00');
      
      const confirmedApt = mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T10:00:00'),
        duration: 30,
        clientName: 'Confirmed Client',
        serviceName: 'Cut',
        price: '30.00'
      });

      const pendingApt = mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T11:00:00'),
        duration: 45,
        clientName: 'Pending Client',
        serviceName: 'Style',
        price: '45.00'
      });
      pendingApt.status = 'pending';

      const dayAppointments = mobileCalendarService.getMobileAppointmentsForDate(testDate);
      const confirmedOnly = mobileCalendarService.filterMobileAppointmentsByStatus(dayAppointments, 'confirmed');
      const pendingOnly = mobileCalendarService.filterMobileAppointmentsByStatus(dayAppointments, 'pending');

      expect(confirmedOnly.length).toBe(1);
      expect(pendingOnly.length).toBe(1);
      expect(confirmedOnly[0].client?.name).toBe('Confirmed Client');
      expect(pendingOnly[0].client?.name).toBe('Pending Client');
    });
  });

  describe('Mobile Travel Appointments', () => {
    it('should identify mobile travel appointments', () => {
      const testDate = new Date('2025-07-16T00:00:00');

      mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T10:00:00'),
        duration: 45,
        clientName: 'Travel Client',
        serviceName: 'Mobile Cut',
        price: '35.00',
        travelRequired: true,
        address: '123 Client Street'
      });

      mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T15:00:00'),
        duration: 30,
        clientName: 'Shop Client',
        serviceName: 'Shop Cut',
        price: '25.00',
        travelRequired: false
      });

      const travelAppointments = mobileCalendarService.getMobileTravelAppointments(testDate);
      expect(travelAppointments.length).toBe(1);
      expect(travelAppointments[0].client?.name).toBe('Travel Client');
      expect(travelAppointments[0].address).toBe('123 Client Street');
    });
  });

  describe('Mobile Current Time Features', () => {
    it('should calculate mobile current time position', () => {
      const position = mobileCalendarService.getMobileCurrentTimePosition();

      expect(position.hour).toBeGreaterThanOrEqual(0);
      expect(position.hour).toBeLessThan(24);
      expect(position.minutes).toBeGreaterThanOrEqual(0);
      expect(position.minutes).toBeLessThan(60);
      expect(position.percentage).toBeGreaterThanOrEqual(0);
      expect(position.percentage).toBeLessThan(100);
    });

    it('should mark current hour in mobile time slots', () => {
      const now = new Date();
      const timeSlots = mobileCalendarService.generateMobileTimeSlots(now);

      const currentSlots = timeSlots.filter(slot => slot.isCurrentHour);
      expect(currentSlots.length).toBe(1);
      expect(currentSlots[0].hour).toBe(now.getHours());
    });
  });

  describe('Mobile Earnings Calculation', () => {
    it('should calculate mobile day earnings from confirmed appointments', () => {
      const testDate = new Date('2025-07-16T00:00:00');

      mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T10:00:00'),
        duration: 30,
        clientName: 'Client 1',
        serviceName: 'Cut',
        price: '30.00'
      });

      mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T14:00:00'),
        duration: 45,
        clientName: 'Client 2',
        serviceName: 'Style',
        price: '50.00'
      });

      const pendingApt = mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T16:00:00'),
        duration: 30,
        clientName: 'Pending Client',
        serviceName: 'Trim',
        price: '25.00'
      });
      pendingApt.status = 'pending'; // Should not count towards earnings

      const earnings = mobileCalendarService.calculateMobileDayEarnings(testDate);
      expect(earnings).toBe(80.00); // 30 + 50, excluding pending
    });
  });

  describe('Mobile Edge Cases', () => {
    it('should handle mobile appointments at midnight crossover', () => {
      const lateNight = new Date('2025-07-15T23:30:00');
      const earlyMorning = new Date('2025-07-16T00:30:00');

      mobileCalendarService.addMobileAppointment({
        scheduledAt: lateNight,
        duration: 30,
        clientName: 'Late Client',
        serviceName: 'Quick Cut',
        price: '20.00'
      });

      mobileCalendarService.addMobileAppointment({
        scheduledAt: earlyMorning,
        duration: 45,
        clientName: 'Early Client',
        serviceName: 'Early Cut',
        price: '35.00'
      });

      const july15Appointments = mobileCalendarService.getMobileAppointmentsForDate(new Date('2025-07-15'));
      const july16Appointments = mobileCalendarService.getMobileAppointmentsForDate(new Date('2025-07-16'));

      expect(july15Appointments.length).toBe(1);
      expect(july16Appointments.length).toBe(1);
      expect(july15Appointments[0].client?.name).toBe('Late Client');
      expect(july16Appointments[0].client?.name).toBe('Early Client');
    });

    it('should handle mobile working hours spanning midnight', () => {
      // Set Friday to work until late and Saturday to start early
      mobileCalendarService.updateMobileWorkingHours('friday', {
        start: '09:00',
        end: '23:00',
        enabled: true
      });

      mobileCalendarService.updateMobileWorkingHours('saturday', {
        start: '01:00',
        end: '16:00',
        enabled: true
      });

      const fridaySlots = mobileCalendarService.generateMobileTimeSlots(new Date('2025-07-18T00:00:00')); // Friday
      const saturdaySlots = mobileCalendarService.generateMobileTimeSlots(new Date('2025-07-19T00:00:00')); // Saturday

      const fridayLateSlot = fridaySlots.find(slot => slot.hour === 22);
      const saturdayEarlySlot = saturdaySlots.find(slot => slot.hour === 1);

      expect(fridayLateSlot?.isBlocked).toBe(false);
      expect(saturdayEarlySlot?.isBlocked).toBe(false);
    });

    it('should maintain mobile optimization across all features', () => {
      const testDate = new Date('2025-07-16T00:00:00');
      
      mobileCalendarService.addMobileAppointment({
        scheduledAt: new Date('2025-07-16T14:00:00'),
        duration: 60,
        clientName: 'Mobile Client',
        serviceName: 'Mobile Service',
        price: '45.00',
        travelRequired: true
      });

      const calendarView = mobileCalendarService.createMobileCalendarView(testDate);
      const timeSlots = calendarView.timeSlots;
      const appointmentSlot = timeSlots.find(slot => slot.appointments.length > 0);

      expect(calendarView.mobileLayout).toBe(true);
      expect(timeSlots.every(slot => slot.mobileOptimized)).toBe(true);
      expect(appointmentSlot?.appointments[0].travelRequired).toBe(true);
    });
  });
});