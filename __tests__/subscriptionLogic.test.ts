import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock interfaces for subscription system
interface User {
  id: number;
  email: string;
  planType: 'basic' | 'premium';
  subscriptionEnd?: Date;
  monthlyAppointments: number;
  monthlySMS: number;
  monthlyBookingRequests: number;
  photoStorageUsed: number; // in MB
  appointmentCount: number;
  reviewPrompted: boolean;
}

interface Service {
  id: number;
  userId: number;
  name: string;
  isActive: boolean;
  price: string;
}

interface Appointment {
  id: number;
  userId: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
}

interface BookingRequest {
  id: number;
  userId: number;
  clientPhone: string;
  message: string;
  isVisible: boolean;
  createdAt: Date;
}

interface WorkingHours {
  [day: string]: {
    enabled: boolean;
    start: string;
    end: string;
    breaks?: Array<{
      start: string;
      end: string;
      label: string;
    }>;
  };
}

interface SubscriptionLimits {
  maxAppointments: number;
  maxBookingRequests: number;
  maxServices: number;
  maxSMS: number;
  maxPhotoStorage: number; // in MB
  canEditWorkingHours: boolean;
  canUseAnalytics: boolean;
}

interface UpgradePrompt {
  message: string;
  redirectTo: string;
  shown: boolean;
}

// Mock subscription service
class MockSubscriptionService {
  private users: User[] = [];
  private services: Service[] = [];
  private appointments: Appointment[] = [];
  private bookingRequests: BookingRequest[] = [];
  private workingHours: { [userId: number]: WorkingHours } = {};

  constructor() {
    this.setupMockData();
  }

  private setupMockData() {
    // Basic plan user
    this.users.push({
      id: 1,
      email: 'basic@example.com',
      planType: 'basic',
      monthlyAppointments: 0,
      monthlySMS: 0,
      monthlyBookingRequests: 0,
      photoStorageUsed: 0,
      appointmentCount: 0,
      reviewPrompted: false
    });

    // Premium plan user
    this.users.push({
      id: 2,
      email: 'premium@example.com',
      planType: 'premium',
      subscriptionEnd: new Date('2025-12-31'),
      monthlyAppointments: 0,
      monthlySMS: 0,
      monthlyBookingRequests: 0,
      photoStorageUsed: 0,
      appointmentCount: 0,
      reviewPrompted: false
    });

    // User at limits
    this.users.push({
      id: 3,
      email: 'atlimit@example.com',
      planType: 'basic',
      monthlyAppointments: 15,
      monthlySMS: 15,
      monthlyBookingRequests: 15,
      photoStorageUsed: 50,
      appointmentCount: 4,
      reviewPrompted: false
    });
  }

  getUser(userId: number): User | undefined {
    return this.users.find(u => u.id === userId);
  }

  getSubscriptionLimits(planType: 'basic' | 'premium'): SubscriptionLimits {
    if (planType === 'premium') {
      return {
        maxAppointments: Infinity,
        maxBookingRequests: Infinity,
        maxServices: Infinity,
        maxSMS: Infinity,
        maxPhotoStorage: 1024, // 1GB
        canEditWorkingHours: true,
        canUseAnalytics: true
      };
    }

    return {
      maxAppointments: 15,
      maxBookingRequests: 15,
      maxServices: 3,
      maxSMS: 15,
      maxPhotoStorage: 50,
      canEditWorkingHours: false,
      canUseAnalytics: false
    };
  }

  canCreateAppointment(userId: number): { allowed: boolean; prompt?: UpgradePrompt } {
    const user = this.getUser(userId);
    if (!user) return { allowed: false };

    const limits = this.getSubscriptionLimits(user.planType);
    
    if (user.monthlyAppointments >= limits.maxAppointments) {
      return {
        allowed: false,
        prompt: {
          message: "You've reached your monthly limit. Upgrade to Premium to book unlimited appointments.",
          redirectTo: "/settings#plan-card",
          shown: true
        }
      };
    }

    return { allowed: true };
  }

  canAcceptBookingRequest(userId: number): { allowed: boolean; prompt?: UpgradePrompt } {
    const user = this.getUser(userId);
    if (!user) return { allowed: false };

    const limits = this.getSubscriptionLimits(user.planType);
    
    if (user.monthlyBookingRequests >= limits.maxBookingRequests) {
      return {
        allowed: false,
        prompt: {
          message: "You have a new booking request, but you've reached your free plan limit. Upgrade to view and accept.",
          redirectTo: "/settings#plan-card",
          shown: true
        }
      };
    }

    return { allowed: true };
  }

  canCreateService(userId: number): { allowed: boolean; prompt?: UpgradePrompt } {
    const user = this.getUser(userId);
    if (!user) return { allowed: false };

    const userServices = this.services.filter(s => s.userId === userId && s.isActive);
    const limits = this.getSubscriptionLimits(user.planType);
    
    if (userServices.length >= limits.maxServices) {
      return {
        allowed: false,
        prompt: {
          message: "You've reached your service limit. Upgrade to Premium to add unlimited services.",
          redirectTo: "/settings#plan-card",
          shown: true
        }
      };
    }

    return { allowed: true };
  }

  canSendSMS(userId: number): { allowed: boolean; prompt?: UpgradePrompt } {
    const user = this.getUser(userId);
    if (!user) return { allowed: false };

    const limits = this.getSubscriptionLimits(user.planType);
    
    if (user.monthlySMS >= limits.maxSMS) {
      return {
        allowed: false,
        prompt: {
          message: "You've reached your SMS limit. Upgrade to Premium for unlimited SMS confirmations.",
          redirectTo: "/settings#plan-card",
          shown: true
        }
      };
    }

    return { allowed: true };
  }

  canUploadPhoto(userId: number, sizeInMB: number): { allowed: boolean; prompt?: UpgradePrompt } {
    const user = this.getUser(userId);
    if (!user) return { allowed: false };

    const limits = this.getSubscriptionLimits(user.planType);
    
    if (user.photoStorageUsed + sizeInMB > limits.maxPhotoStorage) {
      return {
        allowed: false,
        prompt: {
          message: "You've reached your photo storage limit. Upgrade to Premium for 1GB storage.",
          redirectTo: "/settings#plan-card",
          shown: true
        }
      };
    }

    return { allowed: true };
  }

  canEditWorkingHours(userId: number): { allowed: boolean; prompt?: UpgradePrompt } {
    const user = this.getUser(userId);
    if (!user) return { allowed: false };

    const limits = this.getSubscriptionLimits(user.planType);
    
    if (!limits.canEditWorkingHours) {
      return {
        allowed: false,
        prompt: {
          message: "Working hours customization is a Premium feature. Upgrade to set custom hours and breaks.",
          redirectTo: "/settings#plan-card",
          shown: true
        }
      };
    }

    return { allowed: true };
  }

  canUseAnalytics(userId: number): { allowed: boolean; prompt?: UpgradePrompt } {
    const user = this.getUser(userId);
    if (!user) return { allowed: false };

    const limits = this.getSubscriptionLimits(user.planType);
    
    if (!limits.canUseAnalytics) {
      return {
        allowed: false,
        prompt: {
          message: "Client analytics is a Premium feature. Upgrade to access detailed insights.",
          redirectTo: "/settings#plan-card",
          shown: true
        }
      };
    }

    return { allowed: true };
  }

  getVisibleServices(userId: number): Service[] {
    const user = this.getUser(userId);
    if (!user) return [];

    const userServices = this.services.filter(s => s.userId === userId && s.isActive);
    const limits = this.getSubscriptionLimits(user.planType);

    if (user.planType === 'premium') {
      return userServices;
    }

    // Basic plan: show only top 3 services alphabetically
    return userServices
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limits.maxServices);
  }

  downgradeUser(userId: number): { success: boolean; changes: string[] } {
    const user = this.getUser(userId);
    if (!user) return { success: false, changes: [] };

    const changes: string[] = [];

    // Change plan type
    user.planType = 'basic';
    changes.push('Plan changed to Basic');

    // Hide excess services
    const userServices = this.services.filter(s => s.userId === userId && s.isActive);
    const limits = this.getSubscriptionLimits('basic');
    
    if (userServices.length > limits.maxServices) {
      const servicesToHide = userServices
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(limits.maxServices);
      
      servicesToHide.forEach(service => {
        service.isActive = false;
      });
      changes.push(`${servicesToHide.length} services hidden`);
    }

    // Clear custom working hours
    this.workingHours[userId] = {
      hasCustomBreaks: false,
      hasCustomHours: false
    };
    changes.push('Custom working hours cleared');

    return { success: true, changes };
  }

  shouldShowReviewPrompt(userId: number): boolean {
    const user = this.getUser(userId);
    if (!user) return false;

    return user.appointmentCount >= 5 && !user.reviewPrompted;
  }

  markReviewPrompted(userId: number): void {
    const user = this.getUser(userId);
    if (user) {
      user.reviewPrompted = true;
    }
  }

  createAppointment(userId: number): boolean {
    const user = this.getUser(userId);
    if (!user) return false;

    const canCreate = this.canCreateAppointment(userId);
    if (!canCreate.allowed) return false;

    user.monthlyAppointments++;
    user.appointmentCount++;
    return true;
  }

  createService(userId: number, name: string): boolean {
    const user = this.getUser(userId);
    if (!user) return false;

    const canCreate = this.canCreateService(userId);
    if (!canCreate.allowed) return false;

    this.services.push({
      id: this.services.length + 1,
      userId,
      name,
      isActive: true,
      price: '25.00'
    });

    return true;
  }

  resetMonthlyCounters(userId: number): void {
    const user = this.getUser(userId);
    if (user) {
      user.monthlyAppointments = 0;
      user.monthlySMS = 0;
      user.monthlyBookingRequests = 0;
    }
  }
}

describe('Subscription Logic Tests', () => {
  let subscriptionService: MockSubscriptionService;

  beforeEach(() => {
    subscriptionService = new MockSubscriptionService();
  });

  describe('Basic Plan - Appointment Limits', () => {
    it('should allow appointments up to 15 per month', () => {
      const basicUser = subscriptionService.getUser(1)!;
      
      // Create 15 appointments
      for (let i = 0; i < 15; i++) {
        const result = subscriptionService.createAppointment(1);
        expect(result).toBe(true);
      }

      expect(basicUser.monthlyAppointments).toBe(15);
    });

    it('should block 16th appointment with upgrade prompt', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.monthlyAppointments = 15;

      const result = subscriptionService.canCreateAppointment(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.message).toBe("You've reached your monthly limit. Upgrade to Premium to book unlimited appointments.");
      expect(result.prompt?.redirectTo).toBe("/settings#plan-card");
    });

    it('should show upgrade prompt and redirect to plan card', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.monthlyAppointments = 15;

      const result = subscriptionService.canCreateAppointment(1);
      
      expect(result.prompt?.redirectTo).toBe("/settings#plan-card");
      expect(result.prompt?.shown).toBe(true);
    });
  });

  describe('Basic Plan - Booking Request Limits', () => {
    it('should allow booking requests up to 15 per month', () => {
      const basicUser = subscriptionService.getUser(1)!;
      
      for (let i = 0; i < 15; i++) {
        const result = subscriptionService.canAcceptBookingRequest(1);
        expect(result.allowed).toBe(true);
        basicUser.monthlyBookingRequests++;
      }

      expect(basicUser.monthlyBookingRequests).toBe(15);
    });

    it('should block 16th booking request with upgrade notification', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.monthlyBookingRequests = 15;

      const result = subscriptionService.canAcceptBookingRequest(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.message).toBe("You have a new booking request, but you've reached your free plan limit. Upgrade to view and accept.");
    });

    it('should not show booking request in inbox when limit reached', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.monthlyBookingRequests = 15;

      const result = subscriptionService.canAcceptBookingRequest(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.shown).toBe(true);
    });
  });

  describe('Basic Plan - Service Limits', () => {
    it('should allow up to 3 active services', () => {
      const results = [
        subscriptionService.createService(1, 'Haircut'),
        subscriptionService.createService(1, 'Beard Trim'),
        subscriptionService.createService(1, 'Styling')
      ];

      expect(results.every(r => r === true)).toBe(true);
    });

    it('should block 4th service creation with upgrade prompt', () => {
      // Create 3 services first
      subscriptionService.createService(1, 'Haircut');
      subscriptionService.createService(1, 'Beard Trim');
      subscriptionService.createService(1, 'Styling');

      const result = subscriptionService.canCreateService(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.message).toBe("You've reached your service limit. Upgrade to Premium to add unlimited services.");
    });

    it('should hide services beyond top 3 alphabetically when downgraded', () => {
      const premiumUser = subscriptionService.getUser(2)!;
      
      // Create 5 services as premium user
      subscriptionService.createService(2, 'Zebra Cut');
      subscriptionService.createService(2, 'Alpha Trim');
      subscriptionService.createService(2, 'Beta Style');
      subscriptionService.createService(2, 'Gamma Wash');
      subscriptionService.createService(2, 'Delta Color');

      // Downgrade to basic
      const downgradeResult = subscriptionService.downgradeUser(2);
      expect(downgradeResult.success).toBe(true);
      expect(downgradeResult.changes).toContain('2 services hidden');

      // Check visible services (should be top 3 alphabetically)
      const visibleServices = subscriptionService.getVisibleServices(2);
      expect(visibleServices.length).toBe(3);
      expect(visibleServices[0].name).toBe('Alpha Trim');
      expect(visibleServices[1].name).toBe('Beta Style');
      expect(visibleServices[2].name).toBe('Delta Color');
    });

    it('should exclude hidden services from all workflows', () => {
      const premiumUser = subscriptionService.getUser(2)!;
      
      // Create services and downgrade
      subscriptionService.createService(2, 'Zebra Cut');
      subscriptionService.createService(2, 'Alpha Trim');
      subscriptionService.createService(2, 'Beta Style');
      subscriptionService.createService(2, 'Gamma Wash');
      
      subscriptionService.downgradeUser(2);

      const visibleServices = subscriptionService.getVisibleServices(2);
      
      // Should only show 3 services, excluding hidden ones (alphabetically: Alpha, Beta, Gamma)
      expect(visibleServices.length).toBe(3);
      expect(visibleServices.some(s => s.name === 'Zebra Cut')).toBe(false);
      expect(visibleServices.some(s => s.name === 'Gamma Wash')).toBe(true);
    });
  });

  describe('Basic Plan - Working Hours Restrictions', () => {
    it('should block working hours editing with upgrade prompt', () => {
      const result = subscriptionService.canEditWorkingHours(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.message).toBe("Working hours customization is a Premium feature. Upgrade to set custom hours and breaks.");
    });

    it('should clear custom working hours on downgrade', () => {
      const downgradeResult = subscriptionService.downgradeUser(2);
      
      expect(downgradeResult.success).toBe(true);
      expect(downgradeResult.changes).toContain('Custom working hours cleared');
    });
  });

  describe('Basic Plan - SMS Limits', () => {
    it('should allow up to 15 SMS per month', () => {
      const basicUser = subscriptionService.getUser(1)!;
      
      for (let i = 0; i < 15; i++) {
        const result = subscriptionService.canSendSMS(1);
        expect(result.allowed).toBe(true);
        basicUser.monthlySMS++;
      }

      expect(basicUser.monthlySMS).toBe(15);
    });

    it('should block 16th SMS with upgrade prompt', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.monthlySMS = 15;

      const result = subscriptionService.canSendSMS(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.message).toBe("You've reached your SMS limit. Upgrade to Premium for unlimited SMS confirmations.");
    });
  });

  describe('Basic Plan - Photo Storage Limits', () => {
    it('should allow uploads up to 50MB', () => {
      const result = subscriptionService.canUploadPhoto(1, 50);
      
      expect(result.allowed).toBe(true);
    });

    it('should block uploads beyond 50MB limit', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.photoStorageUsed = 50;

      const result = subscriptionService.canUploadPhoto(1, 1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.message).toBe("You've reached your photo storage limit. Upgrade to Premium for 1GB storage.");
    });

    it('should track cumulative storage usage', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.photoStorageUsed = 45;

      const result = subscriptionService.canUploadPhoto(1, 6);
      
      expect(result.allowed).toBe(false);
    });
  });

  describe('Basic Plan - Analytics Restrictions', () => {
    it('should block analytics dropdown with upgrade prompt', () => {
      const result = subscriptionService.canUseAnalytics(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.message).toBe("Client analytics is a Premium feature. Upgrade to access detailed insights.");
    });

    it('should show analytics card but disable dropdown', () => {
      const result = subscriptionService.canUseAnalytics(1);
      
      expect(result.allowed).toBe(false);
      expect(result.prompt?.redirectTo).toBe("/settings#plan-card");
    });
  });

  describe('Premium Plan - Full Access', () => {
    it('should allow unlimited appointments', () => {
      const premiumUser = subscriptionService.getUser(2)!;
      premiumUser.monthlyAppointments = 100;

      const result = subscriptionService.canCreateAppointment(2);
      
      expect(result.allowed).toBe(true);
    });

    it('should allow unlimited services', () => {
      for (let i = 0; i < 10; i++) {
        const result = subscriptionService.createService(2, `Service ${i}`);
        expect(result).toBe(true);
      }
    });

    it('should allow unlimited SMS', () => {
      const premiumUser = subscriptionService.getUser(2)!;
      premiumUser.monthlySMS = 100;

      const result = subscriptionService.canSendSMS(2);
      
      expect(result.allowed).toBe(true);
    });

    it('should allow 1GB photo storage', () => {
      const result = subscriptionService.canUploadPhoto(2, 1024);
      
      expect(result.allowed).toBe(true);
    });

    it('should allow working hours editing', () => {
      const result = subscriptionService.canEditWorkingHours(2);
      
      expect(result.allowed).toBe(true);
    });

    it('should allow full analytics access', () => {
      const result = subscriptionService.canUseAnalytics(2);
      
      expect(result.allowed).toBe(true);
    });

    it('should display subscription end date', () => {
      const premiumUser = subscriptionService.getUser(2)!;
      
      expect(premiumUser.subscriptionEnd).toBeDefined();
      expect(premiumUser.subscriptionEnd).toBeInstanceOf(Date);
    });
  });

  describe('App Review Prompt', () => {
    it('should show review prompt after 5 appointments', () => {
      const user = subscriptionService.getUser(1)!;
      user.appointmentCount = 5;

      const shouldShow = subscriptionService.shouldShowReviewPrompt(1);
      
      expect(shouldShow).toBe(true);
    });

    it('should not show review prompt if already prompted', () => {
      const user = subscriptionService.getUser(1)!;
      user.appointmentCount = 5;
      user.reviewPrompted = true;

      const shouldShow = subscriptionService.shouldShowReviewPrompt(1);
      
      expect(shouldShow).toBe(false);
    });

    it('should not show review prompt before 5 appointments', () => {
      const user = subscriptionService.getUser(1)!;
      user.appointmentCount = 4;

      const shouldShow = subscriptionService.shouldShowReviewPrompt(1);
      
      expect(shouldShow).toBe(false);
    });

    it('should mark user as prompted after showing', () => {
      const user = subscriptionService.getUser(1)!;
      user.appointmentCount = 5;

      subscriptionService.markReviewPrompted(1);
      
      expect(user.reviewPrompted).toBe(true);
    });
  });

  describe('Monthly Counter Resets', () => {
    it('should reset all monthly counters', () => {
      const user = subscriptionService.getUser(3)!; // User at limits
      
      expect(user.monthlyAppointments).toBe(15);
      expect(user.monthlySMS).toBe(15);
      expect(user.monthlyBookingRequests).toBe(15);

      subscriptionService.resetMonthlyCounters(3);

      expect(user.monthlyAppointments).toBe(0);
      expect(user.monthlySMS).toBe(0);
      expect(user.monthlyBookingRequests).toBe(0);
    });
  });

  describe('Plan Transition Logic', () => {
    it('should handle upgrade from basic to premium', () => {
      const basicUser = subscriptionService.getUser(1)!;
      basicUser.planType = 'premium';
      basicUser.subscriptionEnd = new Date('2025-12-31');

      const limits = subscriptionService.getSubscriptionLimits('premium');
      
      expect(limits.maxAppointments).toBe(Infinity);
      expect(limits.maxServices).toBe(Infinity);
      expect(limits.canEditWorkingHours).toBe(true);
      expect(limits.canUseAnalytics).toBe(true);
    });

    it('should handle downgrade from premium to basic', () => {
      const result = subscriptionService.downgradeUser(2);
      
      expect(result.success).toBe(true);
      expect(result.changes).toContain('Plan changed to Basic');
      expect(result.changes).toContain('Custom working hours cleared');
    });

    it('should re-evaluate all features on plan change', () => {
      // Start with premium user
      const premiumUser = subscriptionService.getUser(2)!;
      
      // Create services and set high usage
      subscriptionService.createService(2, 'Service 1');
      subscriptionService.createService(2, 'Service 2');
      subscriptionService.createService(2, 'Service 3');
      subscriptionService.createService(2, 'Service 4');
      subscriptionService.createService(2, 'Service 5');
      
      // Downgrade
      subscriptionService.downgradeUser(2);
      
      // Check that basic plan limits are now enforced
      const canCreateMoreServices = subscriptionService.canCreateService(2);
      expect(canCreateMoreServices.allowed).toBe(false);
      
      const canEditWorkingHours = subscriptionService.canEditWorkingHours(2);
      expect(canEditWorkingHours.allowed).toBe(false);
      
      const canUseAnalytics = subscriptionService.canUseAnalytics(2);
      expect(canUseAnalytics.allowed).toBe(false);
    });
  });

  describe('Upgrade Prompt Routing', () => {
    it('should route all upgrade prompts to settings plan card', () => {
      const prompts = [
        subscriptionService.canCreateAppointment(3),
        subscriptionService.canAcceptBookingRequest(3),
        subscriptionService.canSendSMS(3),
        subscriptionService.canUploadPhoto(3, 1),
        subscriptionService.canEditWorkingHours(3),
        subscriptionService.canUseAnalytics(3)
      ];

      prompts.forEach(prompt => {
        expect(prompt.allowed).toBe(false);
        expect(prompt.prompt?.redirectTo).toBe("/settings#plan-card");
      });
    });

    it('should deep-link correctly to upgrade section', () => {
      const result = subscriptionService.canCreateAppointment(3);
      
      expect(result.prompt?.redirectTo).toBe("/settings#plan-card");
      expect(result.prompt?.redirectTo.includes('#plan-card')).toBe(true);
    });
  });
});