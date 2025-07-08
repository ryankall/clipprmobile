import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock subscription user data
interface User {
  id: number;
  email: string;
  subscriptionStatus: 'basic' | 'premium' | 'cancelled';
  subscriptionStartDate: Date | null;
  subscriptionEndDate: Date | null;
  subscriptionInterval: 'monthly' | 'yearly' | null;
  stripeSubscriptionId: string | null;
  lastPaymentIntentId: string | null;
}

interface SubscriptionStatusResponse {
  status: string;
  interval: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isEligibleForRefund: boolean;
  refundDeadline: Date | null;
}

interface CancellationResponse {
  success: boolean;
  message: string;
  accessUntil: string;
}

interface RefundResponse {
  success: boolean;
  message: string;
  refundId: string;
  amount: number;
}

// Mock Stripe service
class MockStripeService {
  private subscriptions: Map<string, any> = new Map();
  private refunds: Map<string, any> = new Map();

  constructor() {
    // Mock subscription data
    this.subscriptions.set('sub_monthly_active', {
      id: 'sub_monthly_active',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      cancel_at_period_end: false,
    });

    this.subscriptions.set('sub_yearly_active', {
      id: 'sub_yearly_active',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 365 days from now
      cancel_at_period_end: false,
    });
  }

  async updateSubscription(subscriptionId: string, updates: any): Promise<any> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    
    Object.assign(subscription, updates);
    return subscription;
  }

  async createRefund(paymentIntentId: string, amount: number): Promise<any> {
    const refundId = `re_${Date.now()}`;
    const refund = {
      id: refundId,
      payment_intent: paymentIntentId,
      amount: amount * 100, // Convert to cents
      status: 'succeeded',
      reason: 'requested_by_customer',
    };
    
    this.refunds.set(refundId, refund);
    return refund;
  }

  getSubscription(subscriptionId: string): any {
    return this.subscriptions.get(subscriptionId);
  }

  getRefund(refundId: string): any {
    return this.refunds.get(refundId);
  }
}

// Refund eligibility logic
function isEligibleForRefund(subscriptionStartDate: Date): boolean {
  const now = new Date();
  const diffInMs = now.getTime() - subscriptionStartDate.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays <= 30;
}

// Subscription management service
class SubscriptionManagementService {
  private stripeService: MockStripeService;
  private users: Map<number, User> = new Map();

  constructor() {
    this.stripeService = new MockStripeService();
    this.setupTestUsers();
  }

  private setupTestUsers(): void {
    // User with recent premium subscription (eligible for refund)
    const recentPremiumUser: User = {
      id: 1,
      email: 'recent@test.com',
      subscriptionStatus: 'premium',
      subscriptionStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      subscriptionEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      subscriptionInterval: 'monthly',
      stripeSubscriptionId: 'sub_monthly_active',
      lastPaymentIntentId: 'pi_recent_payment',
    };

    // User with old premium subscription (not eligible for refund)
    const oldPremiumUser: User = {
      id: 2,
      email: 'old@test.com',
      subscriptionStatus: 'premium',
      subscriptionStartDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      subscriptionEndDate: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000), // 320 days from now
      subscriptionInterval: 'yearly',
      stripeSubscriptionId: 'sub_yearly_active',
      lastPaymentIntentId: 'pi_old_payment',
    };

    // Basic user (no subscription)
    const basicUser: User = {
      id: 3,
      email: 'basic@test.com',
      subscriptionStatus: 'basic',
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      subscriptionInterval: null,
      stripeSubscriptionId: null,
      lastPaymentIntentId: null,
    };

    // User with cancelled subscription (still has access)
    const cancelledUser: User = {
      id: 4,
      email: 'cancelled@test.com',
      subscriptionStatus: 'cancelled',
      subscriptionStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      subscriptionEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      subscriptionInterval: 'monthly',
      stripeSubscriptionId: 'sub_monthly_active',
      lastPaymentIntentId: 'pi_cancelled_payment',
    };

    this.users.set(1, recentPremiumUser);
    this.users.set(2, oldPremiumUser);
    this.users.set(3, basicUser);
    this.users.set(4, cancelledUser);
  }

  async getSubscriptionStatus(userId: number): Promise<SubscriptionStatusResponse> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const isEligibleForRefund = user.subscriptionStartDate ? 
      (now.getTime() - user.subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24) <= 30 : false;

    return {
      status: user.subscriptionStatus,
      interval: user.subscriptionInterval,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      isEligibleForRefund,
      refundDeadline: user.subscriptionStartDate ? 
        new Date(user.subscriptionStartDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null
    };
  }

  async cancelSubscription(userId: number): Promise<CancellationResponse> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel subscription at period end
    const subscription = await this.stripeService.updateSubscription(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update user subscription status
    user.subscriptionStatus = 'cancelled';
    user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);

    return {
      success: true,
      message: 'Subscription cancelled successfully',
      accessUntil: new Date(subscription.current_period_end * 1000).toISOString()
    };
  }

  async requestRefund(userId: number): Promise<RefundResponse> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.lastPaymentIntentId) {
      throw new Error('No payment found for refund');
    }

    // Check refund eligibility (30 days)
    const now = new Date();
    const subscriptionStart = user.subscriptionStartDate;
    
    if (!subscriptionStart) {
      throw new Error('Subscription start date not found');
    }

    const diffInMs = now.getTime() - subscriptionStart.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    if (diffInDays > 30) {
      throw new Error('Refund period has expired. Refunds are only available within 30 days of subscription start.');
    }

    // Determine refund amount based on subscription interval
    const refundAmount = user.subscriptionInterval === 'yearly' ? 199.99 : 19.99;

    // Create refund
    const refund = await this.stripeService.createRefund(user.lastPaymentIntentId, refundAmount);

    // Update user to basic plan immediately
    user.subscriptionStatus = 'basic';
    user.subscriptionStartDate = null;
    user.subscriptionEndDate = null;
    user.subscriptionInterval = null;
    user.stripeSubscriptionId = null;
    user.lastPaymentIntentId = null;

    return {
      success: true,
      message: 'Refund processed successfully',
      refundId: refund.id,
      amount: refund.amount / 100
    };
  }

  getUser(userId: number): User | undefined {
    return this.users.get(userId);
  }
}

// Test suite
describe('Premium Plan Cancellation and Refund System', () => {
  let subscriptionService: SubscriptionManagementService;

  beforeEach(() => {
    subscriptionService = new SubscriptionManagementService();
  });

  // Refund Eligibility Logic Tests
  describe('Refund Eligibility Logic', () => {
    it('returns true within 30 days', () => {
      const date = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
      expect(isEligibleForRefund(date)).toBe(true);
    });

    it('returns true exactly at 30 days', () => {
      const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // exactly 30 days ago
      expect(isEligibleForRefund(date)).toBe(true);
    });

    it('returns false after 30 days', () => {
      const date = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      expect(isEligibleForRefund(date)).toBe(false);
    });

    it('returns false after 31 days', () => {
      const date = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      expect(isEligibleForRefund(date)).toBe(false);
    });

    it('returns true for new subscription (1 day ago)', () => {
      const date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      expect(isEligibleForRefund(date)).toBe(true);
    });

    it('returns true for very recent subscription (1 hour ago)', () => {
      const date = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      expect(isEligibleForRefund(date)).toBe(true);
    });
  });

  // Subscription Status Tests
  describe('Subscription Status API', () => {
    it('returns correct status for recent premium user (eligible for refund)', async () => {
      const status = await subscriptionService.getSubscriptionStatus(1);
      
      expect(status.status).toBe('premium');
      expect(status.interval).toBe('monthly');
      expect(status.isEligibleForRefund).toBe(true);
      expect(status.refundDeadline).toBeTruthy();
      expect(status.startDate).toBeTruthy();
      expect(status.endDate).toBeTruthy();
    });

    it('returns correct status for old premium user (not eligible for refund)', async () => {
      const status = await subscriptionService.getSubscriptionStatus(2);
      
      expect(status.status).toBe('premium');
      expect(status.interval).toBe('yearly');
      expect(status.isEligibleForRefund).toBe(false);
      expect(status.refundDeadline).toBeTruthy();
      expect(status.startDate).toBeTruthy();
      expect(status.endDate).toBeTruthy();
    });

    it('returns correct status for basic user', async () => {
      const status = await subscriptionService.getSubscriptionStatus(3);
      
      expect(status.status).toBe('basic');
      expect(status.interval).toBe(null);
      expect(status.isEligibleForRefund).toBe(false);
      expect(status.refundDeadline).toBe(null);
      expect(status.startDate).toBe(null);
      expect(status.endDate).toBe(null);
    });

    it('returns correct status for cancelled user', async () => {
      const status = await subscriptionService.getSubscriptionStatus(4);
      
      expect(status.status).toBe('cancelled');
      expect(status.interval).toBe('monthly');
      expect(status.isEligibleForRefund).toBe(true); // Still within 30 days
      expect(status.refundDeadline).toBeTruthy();
      expect(status.startDate).toBeTruthy();
      expect(status.endDate).toBeTruthy();
    });

    it('throws error for non-existent user', async () => {
      await expect(subscriptionService.getSubscriptionStatus(999)).rejects.toThrow('User not found');
    });
  });

  // Subscription Cancellation Tests
  describe('Subscription Cancellation', () => {
    it('successfully cancels monthly subscription', async () => {
      const response = await subscriptionService.cancelSubscription(1);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Subscription cancelled successfully');
      expect(response.accessUntil).toBeTruthy();
      
      // Verify user status updated
      const user = subscriptionService.getUser(1);
      expect(user?.subscriptionStatus).toBe('cancelled');
      expect(user?.subscriptionEndDate).toBeTruthy();
    });

    it('successfully cancels yearly subscription', async () => {
      const response = await subscriptionService.cancelSubscription(2);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Subscription cancelled successfully');
      expect(response.accessUntil).toBeTruthy();
      
      // Verify user status updated
      const user = subscriptionService.getUser(2);
      expect(user?.subscriptionStatus).toBe('cancelled');
      expect(user?.subscriptionEndDate).toBeTruthy();
    });

    it('fails to cancel subscription for basic user', async () => {
      await expect(subscriptionService.cancelSubscription(3)).rejects.toThrow('No active subscription found');
    });

    it('fails to cancel subscription for non-existent user', async () => {
      await expect(subscriptionService.cancelSubscription(999)).rejects.toThrow('User not found');
    });

    it('preserves access until end of billing period', async () => {
      const response = await subscriptionService.cancelSubscription(1);
      const accessUntil = new Date(response.accessUntil);
      const now = new Date();
      
      // Access should be preserved for at least 25 days (monthly subscription)
      const diffInDays = (accessUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeGreaterThan(25);
    });
  });

  // Refund Request Tests
  describe('Refund Requests', () => {
    it('successfully processes refund for recent premium user', async () => {
      const response = await subscriptionService.requestRefund(1);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Refund processed successfully');
      expect(response.refundId).toBeTruthy();
      expect(response.amount).toBe(19.99); // Monthly subscription amount
      
      // Verify user downgraded to basic immediately
      const user = subscriptionService.getUser(1);
      expect(user?.subscriptionStatus).toBe('basic');
      expect(user?.subscriptionStartDate).toBe(null);
      expect(user?.subscriptionEndDate).toBe(null);
      expect(user?.stripeSubscriptionId).toBe(null);
    });

    it('successfully processes refund for yearly subscription', async () => {
      // Create a recent yearly subscriber
      const recentYearlyUser = subscriptionService.getUser(2);
      if (recentYearlyUser) {
        recentYearlyUser.subscriptionStartDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      }
      
      const response = await subscriptionService.requestRefund(2);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Refund processed successfully');
      expect(response.refundId).toBeTruthy();
      expect(response.amount).toBe(199.99); // Yearly subscription amount
    });

    it('fails refund for user past 30-day window', async () => {
      await expect(subscriptionService.requestRefund(2)).rejects.toThrow('Refund period has expired');
    });

    it('fails refund for basic user', async () => {
      await expect(subscriptionService.requestRefund(3)).rejects.toThrow('No payment found for refund');
    });

    it('fails refund for non-existent user', async () => {
      await expect(subscriptionService.requestRefund(999)).rejects.toThrow('User not found');
    });

    it('fails refund for user without subscription start date', async () => {
      const user = subscriptionService.getUser(1);
      if (user) {
        user.subscriptionStartDate = null;
      }
      
      await expect(subscriptionService.requestRefund(1)).rejects.toThrow('Subscription start date not found');
    });

    it('immediately revokes premium features after refund', async () => {
      const userBefore = subscriptionService.getUser(1);
      expect(userBefore?.subscriptionStatus).toBe('premium');
      
      await subscriptionService.requestRefund(1);
      
      const userAfter = subscriptionService.getUser(1);
      expect(userAfter?.subscriptionStatus).toBe('basic');
      expect(userAfter?.subscriptionStartDate).toBe(null);
      expect(userAfter?.subscriptionEndDate).toBe(null);
      expect(userAfter?.subscriptionInterval).toBe(null);
    });
  });

  // Edge Cases and Error Handling
  describe('Edge Cases and Error Handling', () => {
    it('handles refund request on exact 30-day boundary', async () => {
      const user = subscriptionService.getUser(1);
      if (user) {
        user.subscriptionStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // exactly 30 days ago
      }
      
      const response = await subscriptionService.requestRefund(1);
      expect(response.success).toBe(true);
    });

    it('handles refund request just past 30-day boundary', async () => {
      const user = subscriptionService.getUser(1);
      if (user) {
        user.subscriptionStartDate = new Date(Date.now() - 30.1 * 24 * 60 * 60 * 1000); // 30.1 days ago
      }
      
      await expect(subscriptionService.requestRefund(1)).rejects.toThrow('Refund period has expired');
    });

    it('calculates refund deadline correctly', async () => {
      const status = await subscriptionService.getSubscriptionStatus(1);
      
      if (status.startDate && status.refundDeadline) {
        const diffInMs = status.refundDeadline.getTime() - status.startDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
        expect(diffInDays).toBe(30);
      }
    });

    it('handles multiple cancellation attempts', async () => {
      await subscriptionService.cancelSubscription(1);
      
      // Second cancellation should still work (idempotent)
      const response = await subscriptionService.cancelSubscription(1);
      expect(response.success).toBe(true);
    });

    it('prevents refund after cancellation and waiting period', async () => {
      // Cancel subscription first
      await subscriptionService.cancelSubscription(1);
      
      // Simulate user waiting past 30 days
      const user = subscriptionService.getUser(1);
      if (user) {
        user.subscriptionStartDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      }
      
      await expect(subscriptionService.requestRefund(1)).rejects.toThrow('Refund period has expired');
    });
  });

  // Business Logic Validation
  describe('Business Logic Validation', () => {
    it('enforces 30-day money-back guarantee policy', () => {
      const validDates = [
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day
        new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days
        new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 29 days
        new Date(Date.now() - 29.9 * 24 * 60 * 60 * 1000), // just under 30 days
      ];
      
      const invalidDates = [
        new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days
        new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
      ];
      
      validDates.forEach(date => {
        expect(isEligibleForRefund(date)).toBe(true);
      });
      
      invalidDates.forEach(date => {
        expect(isEligibleForRefund(date)).toBe(false);
      });
    });

    it('correctly calculates refund amounts for different plans', async () => {
      // Monthly refund
      const monthlyResponse = await subscriptionService.requestRefund(1);
      expect(monthlyResponse.amount).toBe(19.99);
      
      // Reset user for yearly test
      const yearlyUser = subscriptionService.getUser(2);
      if (yearlyUser) {
        yearlyUser.subscriptionStartDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      }
      
      const yearlyResponse = await subscriptionService.requestRefund(2);
      expect(yearlyResponse.amount).toBe(199.99);
    });

    it('maintains subscription access until period end for cancellations', async () => {
      const statusBefore = await subscriptionService.getSubscriptionStatus(1);
      await subscriptionService.cancelSubscription(1);
      const statusAfter = await subscriptionService.getSubscriptionStatus(1);
      
      expect(statusBefore.endDate).toBeTruthy();
      expect(statusAfter.endDate).toBeTruthy();
      expect(statusAfter.status).toBe('cancelled');
      
      // End date should be preserved or extended
      if (statusBefore.endDate && statusAfter.endDate) {
        expect(statusAfter.endDate.getTime()).toBeGreaterThanOrEqual(statusBefore.endDate.getTime());
      }
    });
  });
});