import { describe, it, expect, beforeEach } from 'vitest';

// Types for mobile appointment expiry system
interface MobilePendingAppointment {
  id: number;
  userId: number;
  clientId: number;
  scheduledAt: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  duration: number;
  createdAt: Date;
  expiresAt: Date;
  mobileBooking: boolean;
  notificationSent: boolean;
  lastNotificationAt?: Date;
}

interface MobileExpiryNotification {
  appointmentId: number;
  clientPhone: string;
  message: string;
  sentAt: Date;
  notificationType: 'warning' | 'expired' | 'final_warning';
}

interface MobilePendingCard {
  appointments: MobilePendingAppointment[];
  shouldShow: boolean;
  expiredCount: number;
  warningCount: number;
  mobileOptimized: boolean;
}

// Mock mobile appointment expiry service
class MockMobileAppointmentExpiryService {
  private appointments: MobilePendingAppointment[] = [];
  private notifications: MobileExpiryNotification[] = [];
  private readonly MOBILE_EXPIRY_MINUTES = 30; // Mobile bookings expire faster
  private readonly WARNING_MINUTES = 20; // Warning at 20 minutes for mobile
  private readonly FINAL_WARNING_MINUTES = 25; // Final warning at 25 minutes
  private nextId = 1;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    const now = new Date();
    
    // Add test mobile appointments with different expiry states
    this.appointments = [
      this.createMobileAppointment(now, -10), // Expired 10 minutes ago
      this.createMobileAppointment(now, 15),  // Expires in 15 minutes (should warn)
      this.createMobileAppointment(now, 5),   // Expires in 5 minutes (final warning)
      this.createMobileAppointment(now, 25),  // Expires in 25 minutes (fresh)
    ];
    this.nextId = 5;
  }

  private createMobileAppointment(baseTime: Date, expiryOffsetMinutes: number): MobilePendingAppointment {
    const createdAt = new Date(baseTime.getTime() - (this.MOBILE_EXPIRY_MINUTES - expiryOffsetMinutes) * 60000);
    const expiresAt = new Date(createdAt.getTime() + this.MOBILE_EXPIRY_MINUTES * 60000);

    return {
      id: this.nextId++,
      userId: 1,
      clientId: 1,
      scheduledAt: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      status: expiryOffsetMinutes < 0 ? 'expired' : 'pending',
      duration: 45,
      createdAt,
      expiresAt,
      mobileBooking: true,
      notificationSent: false
    };
  }

  calculateMobileExpiryTime(createdAt: Date, expiryMinutes: number = this.MOBILE_EXPIRY_MINUTES): Date {
    return new Date(createdAt.getTime() + expiryMinutes * 60000);
  }

  isMobileAppointmentExpired(appointment: MobilePendingAppointment): boolean {
    return new Date() > appointment.expiresAt;
  }

  getMobileTimeUntilExpiry(appointment: MobilePendingAppointment): number {
    const now = new Date();
    const timeLeft = appointment.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeLeft / 60000)); // Minutes until expiry
  }

  shouldSendMobileWarning(appointment: MobilePendingAppointment): boolean {
    if (appointment.status !== 'pending' || appointment.notificationSent) return false;
    
    const minutesLeft = this.getMobileTimeUntilExpiry(appointment);
    return minutesLeft <= this.WARNING_MINUTES && minutesLeft > 0;
  }

  shouldSendMobileFinalWarning(appointment: MobilePendingAppointment): boolean {
    if (appointment.status !== 'pending') return false;
    
    const minutesLeft = this.getMobileTimeUntilExpiry(appointment);
    const alreadySentFinal = this.notifications.some(n => 
      n.appointmentId === appointment.id && n.notificationType === 'final_warning'
    );
    
    return minutesLeft <= (this.MOBILE_EXPIRY_MINUTES - this.FINAL_WARNING_MINUTES) && !alreadySentFinal;
  }

  async processMobileExpiryCheck(): Promise<{
    expiredCount: number;
    warningsSent: number;
    finalWarningsSent: number;
  }> {
    let expiredCount = 0;
    let warningsSent = 0;
    let finalWarningsSent = 0;

    for (const appointment of this.appointments) {
      if (appointment.status !== 'pending') continue;

      if (this.isMobileAppointmentExpired(appointment)) {
        appointment.status = 'expired';
        await this.sendMobileNotification(appointment, 'expired');
        expiredCount++;
      } else if (this.shouldSendMobileFinalWarning(appointment)) {
        await this.sendMobileNotification(appointment, 'final_warning');
        finalWarningsSent++;
      } else if (this.shouldSendMobileWarning(appointment)) {
        await this.sendMobileNotification(appointment, 'warning');
        appointment.notificationSent = true;
        warningsSent++;
      }
    }

    return { expiredCount, warningsSent, finalWarningsSent };
  }

  private async sendMobileNotification(
    appointment: MobilePendingAppointment, 
    type: 'warning' | 'expired' | 'final_warning'
  ): Promise<void> {
    const messages = {
      warning: `Mobile booking expires in ${this.getMobileTimeUntilExpiry(appointment)} minutes. Please confirm soon.`,
      final_warning: 'URGENT: Your mobile booking expires in 5 minutes! Confirm now or it will be cancelled.',
      expired: 'Your mobile booking has expired and has been cancelled. Please book again if needed.'
    };

    const notification: MobileExpiryNotification = {
      appointmentId: appointment.id,
      clientPhone: '(555) 123-4567', // Mock phone
      message: messages[type],
      sentAt: new Date(),
      notificationType: type
    };

    this.notifications.push(notification);
    appointment.lastNotificationAt = new Date();
  }

  filterMobileExpiredAppointments(appointments: MobilePendingAppointment[]): MobilePendingAppointment[] {
    return appointments.filter(apt => apt.status !== 'expired' && apt.mobileBooking);
  }

  getMobileExpiredAppointments(appointments: MobilePendingAppointment[]): MobilePendingAppointment[] {
    return appointments.filter(apt => apt.status === 'expired' && apt.mobileBooking);
  }

  getMobilePendingConfirmationsCard(appointments: MobilePendingAppointment[]): MobilePendingCard {
    const mobileAppointments = appointments.filter(apt => apt.mobileBooking);
    const activeAppointments = this.filterMobileExpiredAppointments(mobileAppointments);
    const expiredAppointments = this.getMobileExpiredAppointments(mobileAppointments);
    
    const warningAppointments = activeAppointments.filter(apt => 
      this.getMobileTimeUntilExpiry(apt) <= this.WARNING_MINUTES
    );

    return {
      appointments: activeAppointments,
      shouldShow: activeAppointments.length > 0,
      expiredCount: expiredAppointments.length,
      warningCount: warningAppointments.length,
      mobileOptimized: true
    };
  }

  // Test helper methods
  addMobileTestAppointment(minutesToExpiry: number): MobilePendingAppointment {
    const now = new Date();
    const appointment = this.createMobileAppointment(now, minutesToExpiry);
    this.appointments.push(appointment);
    return appointment;
  }

  getMobileAppointments(): MobilePendingAppointment[] {
    return this.appointments.filter(apt => apt.mobileBooking);
  }

  getMobileNotifications(): MobileExpiryNotification[] {
    return this.notifications;
  }

  clearMobileData(): void {
    this.appointments = [];
    this.notifications = [];
    this.nextId = 1;
  }

  setMobileExpiryTime(minutes: number): void {
    (this as any).MOBILE_EXPIRY_MINUTES = minutes;
  }

  simulateMobileTimeAdvance(minutes: number): void {
    const advanceMs = minutes * 60000;
    this.appointments.forEach(apt => {
      apt.createdAt = new Date(apt.createdAt.getTime() - advanceMs);
      apt.expiresAt = new Date(apt.expiresAt.getTime() - advanceMs);
    });
  }
}

describe('Mobile Appointment Expiry System', () => {
  let mobileExpiryService: MockMobileAppointmentExpiryService;

  beforeEach(() => {
    mobileExpiryService = new MockMobileAppointmentExpiryService();
    mobileExpiryService.clearMobileData();
  });

  describe('Mobile Expiry Time Calculation', () => {
    it('should calculate mobile expiry time correctly', () => {
      const createdAt = new Date('2025-07-16T10:00:00');
      const expiresAt = mobileExpiryService.calculateMobileExpiryTime(createdAt, 30);
      
      expect(expiresAt.getTime()).toBe(createdAt.getTime() + 30 * 60000);
    });

    it('should use default mobile expiry time when not specified', () => {
      const createdAt = new Date('2025-07-16T10:00:00');
      const expiresAt = mobileExpiryService.calculateMobileExpiryTime(createdAt);
      
      expect(expiresAt.getTime()).toBe(createdAt.getTime() + 30 * 60000);
    });

    it('should handle custom mobile expiry times', () => {
      const createdAt = new Date('2025-07-16T10:00:00');
      const expiresAt = mobileExpiryService.calculateMobileExpiryTime(createdAt, 45);
      
      expect(expiresAt.getTime()).toBe(createdAt.getTime() + 45 * 60000);
    });
  });

  describe('Mobile Appointment Expiry Detection', () => {
    it('should detect expired mobile appointments', () => {
      const expiredAppointment = mobileExpiryService.addMobileTestAppointment(-5); // Expired 5 minutes ago
      const activeAppointment = mobileExpiryService.addMobileTestAppointment(10); // Expires in 10 minutes

      expect(mobileExpiryService.isMobileAppointmentExpired(expiredAppointment)).toBe(true);
      expect(mobileExpiryService.isMobileAppointmentExpired(activeAppointment)).toBe(false);
    });

    it('should calculate time until mobile expiry correctly', () => {
      const appointment = mobileExpiryService.addMobileTestAppointment(15); // 15 minutes left
      
      const timeLeft = mobileExpiryService.getMobileTimeUntilExpiry(appointment);
      expect(timeLeft).toBe(15);
    });

    it('should return zero for expired mobile appointments', () => {
      const expiredAppointment = mobileExpiryService.addMobileTestAppointment(-10);
      
      const timeLeft = mobileExpiryService.getMobileTimeUntilExpiry(expiredAppointment);
      expect(timeLeft).toBe(0);
    });
  });

  describe('Mobile Warning System', () => {
    it('should identify mobile appointments needing warnings', () => {
      const warningAppointment = mobileExpiryService.addMobileTestAppointment(15); // 15 minutes left
      const freshAppointment = mobileExpiryService.addMobileTestAppointment(25); // 25 minutes left

      expect(mobileExpiryService.shouldSendMobileWarning(warningAppointment)).toBe(true);
      expect(mobileExpiryService.shouldSendMobileWarning(freshAppointment)).toBe(false);
    });

    it('should identify mobile appointments needing final warnings', () => {
      const finalWarningAppointment = mobileExpiryService.addMobileTestAppointment(5); // 5 minutes left
      const warningAppointment = mobileExpiryService.addMobileTestAppointment(15); // 15 minutes left

      expect(mobileExpiryService.shouldSendMobileFinalWarning(finalWarningAppointment)).toBe(true);
      expect(mobileExpiryService.shouldSendMobileFinalWarning(warningAppointment)).toBe(false);
    });

    it('should not send duplicate mobile warnings', () => {
      const appointment = mobileExpiryService.addMobileTestAppointment(15);
      appointment.notificationSent = true;

      expect(mobileExpiryService.shouldSendMobileWarning(appointment)).toBe(false);
    });
  });

  describe('Mobile Expiry Processing', () => {
    it('should process mobile expiry check and expire appointments', async () => {
      mobileExpiryService.addMobileTestAppointment(-5); // Already expired
      mobileExpiryService.addMobileTestAppointment(15); // Should warn
      mobileExpiryService.addMobileTestAppointment(5);  // Should final warn

      const result = await mobileExpiryService.processMobileExpiryCheck();

      expect(result.expiredCount).toBe(1);
      expect(result.warningsSent).toBe(1);
      expect(result.finalWarningsSent).toBe(1);
    });

    it('should send mobile notifications during expiry processing', async () => {
      mobileExpiryService.addMobileTestAppointment(-5); // Expired
      mobileExpiryService.addMobileTestAppointment(15); // Warning

      await mobileExpiryService.processMobileExpiryCheck();

      const notifications = mobileExpiryService.getMobileNotifications();
      expect(notifications.length).toBe(2);
      expect(notifications.some(n => n.notificationType === 'expired')).toBe(true);
      expect(notifications.some(n => n.notificationType === 'warning')).toBe(true);
    });
  });

  describe('Mobile Pending Confirmations Card', () => {
    it('should generate mobile pending confirmations card data', () => {
      mobileExpiryService.addMobileTestAppointment(25); // Active
      mobileExpiryService.addMobileTestAppointment(15); // Warning
      mobileExpiryService.addMobileTestAppointment(-5); // Expired

      const appointments = mobileExpiryService.getMobileAppointments();
      const card = mobileExpiryService.getMobilePendingConfirmationsCard(appointments);

      expect(card.shouldShow).toBe(true);
      expect(card.appointments.length).toBe(2); // Only active appointments
      expect(card.expiredCount).toBe(1);
      expect(card.warningCount).toBe(1);
      expect(card.mobileOptimized).toBe(true);
    });

    it('should not show mobile card when no active appointments', () => {
      mobileExpiryService.addMobileTestAppointment(-5); // Only expired
      
      const appointments = mobileExpiryService.getMobileAppointments();
      const card = mobileExpiryService.getMobilePendingConfirmationsCard(appointments);

      expect(card.shouldShow).toBe(false);
      expect(card.appointments.length).toBe(0);
      expect(card.expiredCount).toBe(1);
    });
  });

  describe('Mobile Appointment Filtering', () => {
    it('should filter out expired mobile appointments', () => {
      const appointments = [
        mobileExpiryService.addMobileTestAppointment(15), // Active
        mobileExpiryService.addMobileTestAppointment(-5)  // Expired
      ];
      
      // Manually expire the second appointment
      appointments[1].status = 'expired';

      const filtered = mobileExpiryService.filterMobileExpiredAppointments(appointments);
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe('pending');
    });

    it('should get only expired mobile appointments', () => {
      const appointments = [
        mobileExpiryService.addMobileTestAppointment(15), // Active
        mobileExpiryService.addMobileTestAppointment(-5)  // Expired
      ];
      
      // Manually expire the second appointment
      appointments[1].status = 'expired';

      const expired = mobileExpiryService.getMobileExpiredAppointments(appointments);
      expect(expired.length).toBe(1);
      expect(expired[0].status).toBe('expired');
    });
  });

  describe('Mobile Time Simulation', () => {
    it('should handle mobile time advancement correctly', () => {
      const appointment = mobileExpiryService.addMobileTestAppointment(20); // 20 minutes left
      
      // Advance time by 25 minutes
      mobileExpiryService.simulateMobileTimeAdvance(25);
      
      expect(mobileExpiryService.isMobileAppointmentExpired(appointment)).toBe(true);
    });

    it('should update mobile warning status after time advancement', () => {
      const appointment = mobileExpiryService.addMobileTestAppointment(25); // Fresh appointment
      
      expect(mobileExpiryService.shouldSendMobileWarning(appointment)).toBe(false);
      
      // Advance time to warning threshold
      mobileExpiryService.simulateMobileTimeAdvance(10);
      
      expect(mobileExpiryService.shouldSendMobileWarning(appointment)).toBe(true);
    });
  });

  describe('Mobile Configuration', () => {
    it('should use configurable mobile expiry time', () => {
      mobileExpiryService.setMobileExpiryTime(45); // 45 minutes instead of 30
      
      const appointment = mobileExpiryService.addMobileTestAppointment(40); // 40 minutes left
      
      expect(mobileExpiryService.isMobileAppointmentExpired(appointment)).toBe(false);
      expect(mobileExpiryService.getMobileTimeUntilExpiry(appointment)).toBe(40);
    });
  });

  describe('Mobile Edge Cases', () => {
    it('should handle mobile appointments exactly at expiry time', () => {
      const appointment = mobileExpiryService.addMobileTestAppointment(0); // Exactly at expiry
      
      expect(mobileExpiryService.isMobileAppointmentExpired(appointment)).toBe(true);
      expect(mobileExpiryService.getMobileTimeUntilExpiry(appointment)).toBe(0);
    });

    it('should handle mobile appointments with confirmed status', () => {
      const appointment = mobileExpiryService.addMobileTestAppointment(15);
      appointment.status = 'confirmed';
      
      expect(mobileExpiryService.shouldSendMobileWarning(appointment)).toBe(false);
      expect(mobileExpiryService.shouldSendMobileFinalWarning(appointment)).toBe(false);
    });

    it('should ensure all test appointments are mobile-optimized', () => {
      mobileExpiryService.addMobileTestAppointment(20);
      mobileExpiryService.addMobileTestAppointment(10);
      mobileExpiryService.addMobileTestAppointment(-5);
      
      const appointments = mobileExpiryService.getMobileAppointments();
      expect(appointments.every(apt => apt.mobileBooking)).toBe(true);
    });
  });
});