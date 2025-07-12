import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock interfaces for mobile settings functionality
interface MockUser {
  id: number;
  email: string;
  phone: string;
  phoneVerified: boolean;
  businessName: string;
  serviceArea: string;
  about: string;
  homeBaseAddress: string;
  timezone: string;
  defaultGraceTime: number;
  transportationMode: string;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface MockBlockedClient {
  id: number;
  phoneNumber: string;
  reason?: string;
  blockedAt: Date;
}

interface MockStripeStatus {
  connected: boolean;
  accountId?: string;
  requiresOnboarding?: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
}

interface MockSubscriptionStatus {
  status: 'basic' | 'premium';
  interval?: 'monthly' | 'yearly';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  eligibleForRefund?: boolean;
}

interface MockNotificationSettings {
  newBookingRequests: boolean;
  appointmentConfirmations: boolean;
  appointmentCancellations: boolean;
  upcomingReminders: boolean;
  soundEffects: boolean;
}

interface MockProfileFormData {
  businessName: string;
  email: string;
  phone: string;
  serviceArea: string;
  about: string;
  homeBaseAddress: string;
  timezone: string;
  defaultGraceTime: number;
  transportationMode: string;
}

interface MockPasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface MockSupportForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface MockFAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: string;
}

// Mock mobile settings service
class MockMobileSettingsService {
  private users: Map<number, MockUser> = new Map();
  private blockedClients: Map<number, MockBlockedClient[]> = new Map();
  private stripeStatuses: Map<number, MockStripeStatus> = new Map();
  private subscriptionStatuses: Map<number, MockSubscriptionStatus> = new Map();
  private notificationSettings: Map<number, MockNotificationSettings> = new Map();
  private verificationCodes: Map<string, string> = new Map();
  private currentUserId = 1;

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // Setup mock users
    this.users.set(1, {
      id: 1,
      email: 'barber@example.com',
      phone: '(555) 123-4567',
      phoneVerified: true,
      businessName: 'Elite Cuts',
      serviceArea: 'Downtown Area',
      about: 'Professional barber with 10+ years experience',
      homeBaseAddress: '123 Main St, City, State 12345',
      timezone: 'America/New_York',
      defaultGraceTime: 10,
      transportationMode: 'driving',
      profilePhotoUrl: 'https://example.com/photo.jpg',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    });

    this.users.set(2, {
      id: 2,
      email: 'newbarber@example.com',
      phone: '(555) 987-6543',
      phoneVerified: false,
      businessName: 'Fresh Cuts',
      serviceArea: 'Uptown Area',
      about: 'New barber specializing in modern styles',
      homeBaseAddress: '456 Oak Ave, City, State 12345',
      timezone: 'America/Los_Angeles',
      defaultGraceTime: 5,
      transportationMode: 'public_transport',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z'
    });

    // Setup blocked clients
    this.blockedClients.set(1, [
      {
        id: 1,
        phoneNumber: '(555) 999-0000',
        reason: 'No-show multiple times',
        blockedAt: new Date('2025-01-10T10:00:00Z')
      },
      {
        id: 2,
        phoneNumber: '(555) 888-0000',
        reason: 'Inappropriate behavior',
        blockedAt: new Date('2025-01-05T15:30:00Z')
      }
    ]);

    // Setup Stripe statuses
    this.stripeStatuses.set(1, {
      connected: true,
      accountId: 'acct_123456789',
      requiresOnboarding: false,
      chargesEnabled: true,
      detailsSubmitted: true
    });

    this.stripeStatuses.set(2, {
      connected: false,
      requiresOnboarding: true,
      chargesEnabled: false,
      detailsSubmitted: false
    });

    // Setup subscription statuses
    this.subscriptionStatuses.set(1, {
      status: 'premium',
      interval: 'monthly',
      currentPeriodEnd: new Date('2025-02-01T00:00:00Z'),
      cancelAtPeriodEnd: false,
      eligibleForRefund: true
    });

    this.subscriptionStatuses.set(2, {
      status: 'basic'
    });

    // Setup notification settings
    this.notificationSettings.set(1, {
      newBookingRequests: true,
      appointmentConfirmations: true,
      appointmentCancellations: true,
      upcomingReminders: true,
      soundEffects: true
    });

    this.notificationSettings.set(2, {
      newBookingRequests: false,
      appointmentConfirmations: true,
      appointmentCancellations: false,
      upcomingReminders: true,
      soundEffects: false
    });
  }

  // User profile methods
  async getUser(userId: number): Promise<MockUser | null> {
    return this.users.get(userId) || null;
  }

  async updateUserProfile(userId: number, data: Partial<MockProfileFormData>): Promise<MockUser | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    // Mock password validation
    if (currentPassword === 'wrongpassword') {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return true;
  }

  // Phone verification methods
  async sendVerificationCode(phoneNumber: string): Promise<boolean> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.verificationCodes.set(phoneNumber, code);
    return true;
  }

  async verifyPhoneNumber(phoneNumber: string, code: string): Promise<boolean> {
    const expectedCode = this.verificationCodes.get(phoneNumber);
    if (!expectedCode || expectedCode !== code) {
      return false;
    }

    // Update user phone verification status
    for (const [userId, user] of this.users.entries()) {
      if (user.phone === phoneNumber) {
        user.phoneVerified = true;
        this.users.set(userId, user);
        break;
      }
    }

    this.verificationCodes.delete(phoneNumber);
    return true;
  }

  // Blocked clients methods
  async getBlockedClients(userId: number): Promise<MockBlockedClient[]> {
    return this.blockedClients.get(userId) || [];
  }

  async unblockClient(userId: number, phoneNumber: string): Promise<boolean> {
    const blockedClients = this.blockedClients.get(userId) || [];
    const filteredClients = blockedClients.filter(client => client.phoneNumber !== phoneNumber);
    
    if (filteredClients.length === blockedClients.length) {
      return false; // Client not found
    }

    this.blockedClients.set(userId, filteredClients);
    return true;
  }

  // Stripe methods
  async getStripeStatus(userId: number): Promise<MockStripeStatus | null> {
    return this.stripeStatuses.get(userId) || null;
  }

  async connectStripeAccount(userId: number): Promise<string> {
    // Mock Stripe Connect onboarding URL
    return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_test123&scope=read_write&redirect_uri=https://example.com/callback&state=${userId}`;
  }

  // Subscription methods
  async getSubscriptionStatus(userId: number): Promise<MockSubscriptionStatus | null> {
    return this.subscriptionStatuses.get(userId) || null;
  }

  async createStripeCheckoutSession(userId: number, priceId: string): Promise<string> {
    // Mock Stripe checkout session URL
    return `https://checkout.stripe.com/pay/cs_test_123456789#${priceId}`;
  }

  async cancelSubscription(userId: number): Promise<boolean> {
    const subscription = this.subscriptionStatuses.get(userId);
    if (!subscription || subscription.status !== 'premium') {
      return false;
    }

    subscription.cancelAtPeriodEnd = true;
    this.subscriptionStatuses.set(userId, subscription);
    return true;
  }

  // Notification settings methods
  async getNotificationSettings(userId: number): Promise<MockNotificationSettings | null> {
    return this.notificationSettings.get(userId) || null;
  }

  async updateNotificationSettings(userId: number, settings: Partial<MockNotificationSettings>): Promise<MockNotificationSettings | null> {
    const currentSettings = this.notificationSettings.get(userId);
    if (!currentSettings) return null;

    const updatedSettings = { ...currentSettings, ...settings };
    this.notificationSettings.set(userId, updatedSettings);
    return updatedSettings;
  }

  // Support methods
  async submitSupportRequest(data: MockSupportForm): Promise<boolean> {
    // Mock support ticket creation
    if (!data.name || !data.email || !data.subject || !data.message) {
      return false;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  // FAQ methods
  getFAQData(): MockFAQItem[] {
    return [
      {
        id: "premium-guarantee",
        question: "What is the Premium Guarantee?",
        answer: "Try Clippr Pro risk-free for 30 days. If you're not satisfied, request a full refund — no hassle. You can also cancel your subscription anytime directly from the Settings page.",
        category: "Premium & Billing",
        icon: "🛡️",
      },
      {
        id: "cancel-subscription",
        question: "How do I cancel my subscription?",
        answer: "You can cancel your Premium subscription anytime from Settings → Subscription Management. Your premium access will continue until the end of your current billing period.",
        category: "Premium & Billing",
        icon: "💳",
      },
      {
        id: "appointment-limits",
        question: "What are the appointment limits?",
        answer: "Basic plan allows 15 appointments per month. Premium plan offers unlimited appointments. The counter resets on the first day of each month.",
        category: "Features",
        icon: "📅",
      },
      {
        id: "client-management",
        question: "How do I manage my clients?",
        answer: "Go to the Clients page to add, edit, and track your client information. You can store contact details, service history, and notes for each client.",
        category: "Features",
        icon: "👥",
      },
      {
        id: "data-security",
        question: "Is my data secure?",
        answer: "Yes, we use industry-standard encryption and security measures. Your client data and payment information are protected with bank-level security.",
        category: "Security",
        icon: "🔒",
      },
    ];
  }

  // Utility methods
  setCurrentUser(userId: number): void {
    this.currentUserId = userId;
  }

  getCurrentUser(): MockUser | null {
    return this.users.get(this.currentUserId) || null;
  }

  clearBlockedClients(userId: number): void {
    this.blockedClients.set(userId, []);
  }

  simulateNetworkError(): void {
    throw new Error('Network error occurred');
  }

  getUserCount(): number {
    return this.users.size;
  }

  getBlockedClientCount(userId: number): number {
    return this.blockedClients.get(userId)?.length || 0;
  }
}

// Mobile Settings Page UI Handler
class MockMobileSettingsPageHandler {
  private settingsService: MockMobileSettingsService;
  private currentTab: 'profile' | 'blocked' = 'profile';
  private isEditingProfile = false;
  private isChangingPassword = false;
  private showHelpSupport = false;
  private expandedFAQ: string | null = null;
  private selectedCategory = 'All';

  constructor(settingsService: MockMobileSettingsService) {
    this.settingsService = settingsService;
  }

  // Tab management
  switchTab(tab: 'profile' | 'blocked'): void {
    this.currentTab = tab;
  }

  getCurrentTab(): string {
    return this.currentTab;
  }

  // Profile editing
  startProfileEdit(): void {
    this.isEditingProfile = true;
  }

  cancelProfileEdit(): void {
    this.isEditingProfile = false;
  }

  isProfileEditing(): boolean {
    return this.isEditingProfile;
  }

  async updateProfile(userId: number, data: Partial<MockProfileFormData>): Promise<boolean> {
    try {
      const result = await this.settingsService.updateUserProfile(userId, data);
      if (result) {
        this.isEditingProfile = false;
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Password change
  startPasswordChange(): void {
    this.isChangingPassword = true;
  }

  cancelPasswordChange(): void {
    this.isChangingPassword = false;
  }

  isPasswordChanging(): boolean {
    return this.isChangingPassword;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (newPassword !== confirmPassword) {
        return { success: false, error: 'New passwords do not match' };
      }

      if (newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      const result = await this.settingsService.changePassword(userId, currentPassword, newPassword);
      if (result) {
        this.isChangingPassword = false;
        return { success: true };
      }
      return { success: false, error: 'Failed to change password' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Help & Support
  openHelpSupport(): void {
    this.showHelpSupport = true;
  }

  closeHelpSupport(): void {
    this.showHelpSupport = false;
    this.expandedFAQ = null;
    this.selectedCategory = 'All';
  }

  isHelpSupportOpen(): boolean {
    return this.showHelpSupport;
  }

  toggleFAQ(faqId: string): void {
    this.expandedFAQ = this.expandedFAQ === faqId ? null : faqId;
  }

  getExpandedFAQ(): string | null {
    return this.expandedFAQ;
  }

  setFAQCategory(category: string): void {
    this.selectedCategory = category;
  }

  getFAQCategory(): string {
    return this.selectedCategory;
  }

  filterFAQs(category: string): MockFAQItem[] {
    const faqs = this.settingsService.getFAQData();
    return category === 'All' ? faqs : faqs.filter(faq => faq.category === category);
  }

  async submitSupportRequest(data: MockSupportForm): Promise<boolean> {
    return await this.settingsService.submitSupportRequest(data);
  }

  // Blocked clients management
  async unblockClient(userId: number, phoneNumber: string): Promise<boolean> {
    return await this.settingsService.unblockClient(userId, phoneNumber);
  }

  // Validation methods
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone: string): boolean {
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  }

  formatPhoneNumber(value: string): string {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, "");
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }

  // UI state methods
  getTabCount(): number {
    return 2; // profile and blocked tabs
  }

  getAvailableTimezones(): string[] {
    return [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu'
    ];
  }

  getTransportationModes(): string[] {
    return ['driving', 'walking', 'public_transport', 'cycling'];
  }

  getFAQCategories(): string[] {
    return ['All', 'Premium & Billing', 'Features', 'Security'];
  }
}

// Test Suite
describe('Mobile Settings Page', () => {
  let settingsService: MockMobileSettingsService;
  let pageHandler: MockMobileSettingsPageHandler;

  beforeEach(() => {
    settingsService = new MockMobileSettingsService();
    pageHandler = new MockMobileSettingsPageHandler(settingsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Management', () => {
    it('should display user profile information correctly', async () => {
      const user = await settingsService.getUser(1);
      
      expect(user).toBeDefined();
      expect(user?.businessName).toBe('Elite Cuts');
      expect(user?.email).toBe('barber@example.com');
      expect(user?.phone).toBe('(555) 123-4567');
      expect(user?.phoneVerified).toBe(true);
      expect(user?.serviceArea).toBe('Downtown Area');
      expect(user?.about).toBe('Professional barber with 10+ years experience');
    });

    it('should handle profile editing state correctly', () => {
      expect(pageHandler.isProfileEditing()).toBe(false);
      
      pageHandler.startProfileEdit();
      expect(pageHandler.isProfileEditing()).toBe(true);
      
      pageHandler.cancelProfileEdit();
      expect(pageHandler.isProfileEditing()).toBe(false);
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        businessName: 'Updated Elite Cuts',
        serviceArea: 'Expanded Downtown Area',
        about: 'Updated professional barber description'
      };

      const success = await pageHandler.updateProfile(1, updateData);
      expect(success).toBe(true);
      
      const updatedUser = await settingsService.getUser(1);
      expect(updatedUser?.businessName).toBe('Updated Elite Cuts');
      expect(updatedUser?.serviceArea).toBe('Expanded Downtown Area');
      expect(updatedUser?.about).toBe('Updated professional barber description');
    });

    it('should handle profile update failure', async () => {
      const success = await pageHandler.updateProfile(999, { businessName: 'Test' });
      expect(success).toBe(false);
    });

    it('should validate email format correctly', () => {
      expect(pageHandler.validateEmail('valid@example.com')).toBe(true);
      expect(pageHandler.validateEmail('invalid-email')).toBe(false);
      expect(pageHandler.validateEmail('missing@domain')).toBe(false);
      expect(pageHandler.validateEmail('@invalid.com')).toBe(false);
    });

    it('should validate phone number format correctly', () => {
      expect(pageHandler.validatePhone('(555) 123-4567')).toBe(true);
      expect(pageHandler.validatePhone('555-123-4567')).toBe(false);
      expect(pageHandler.validatePhone('(555) 123-456')).toBe(false);
      expect(pageHandler.validatePhone('invalid-phone')).toBe(false);
    });

    it('should format phone number correctly', () => {
      expect(pageHandler.formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
      expect(pageHandler.formatPhoneNumber('555123')).toBe('(555) 123');
      expect(pageHandler.formatPhoneNumber('555')).toBe('555');
      expect(pageHandler.formatPhoneNumber('')).toBe('');
    });

    it('should handle smart scheduling settings', async () => {
      const schedulingData = {
        homeBaseAddress: '789 New Address St',
        timezone: 'America/Chicago',
        defaultGraceTime: 15,
        transportationMode: 'public_transport'
      };

      const success = await pageHandler.updateProfile(1, schedulingData);
      expect(success).toBe(true);
      
      const updatedUser = await settingsService.getUser(1);
      expect(updatedUser?.homeBaseAddress).toBe('789 New Address St');
      expect(updatedUser?.timezone).toBe('America/Chicago');
      expect(updatedUser?.defaultGraceTime).toBe(15);
      expect(updatedUser?.transportationMode).toBe('public_transport');
    });

    it('should provide available timezone options', () => {
      const timezones = pageHandler.getAvailableTimezones();
      expect(timezones).toContain('America/New_York');
      expect(timezones).toContain('America/Los_Angeles');
      expect(timezones).toContain('America/Chicago');
      expect(timezones.length).toBeGreaterThan(0);
    });

    it('should provide transportation mode options', () => {
      const modes = pageHandler.getTransportationModes();
      expect(modes).toContain('driving');
      expect(modes).toContain('walking');
      expect(modes).toContain('public_transport');
      expect(modes).toContain('cycling');
    });
  });

  describe('Password Management', () => {
    it('should handle password change state correctly', () => {
      expect(pageHandler.isPasswordChanging()).toBe(false);
      
      pageHandler.startPasswordChange();
      expect(pageHandler.isPasswordChanging()).toBe(true);
      
      pageHandler.cancelPasswordChange();
      expect(pageHandler.isPasswordChanging()).toBe(false);
    });

    it('should change password successfully', async () => {
      const result = await pageHandler.changePassword(1, 'oldpassword', 'newpassword123', 'newpassword123');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail password change with mismatched passwords', async () => {
      const result = await pageHandler.changePassword(1, 'oldpassword', 'newpassword123', 'differentpassword');
      expect(result.success).toBe(false);
      expect(result.error).toBe('New passwords do not match');
    });

    it('should fail password change with short password', async () => {
      const result = await pageHandler.changePassword(1, 'oldpassword', 'short', 'short');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should fail password change with wrong current password', async () => {
      const result = await pageHandler.changePassword(1, 'wrongpassword', 'newpassword123', 'newpassword123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should handle password change for non-existent user', async () => {
      const result = await pageHandler.changePassword(999, 'oldpassword', 'newpassword123', 'newpassword123');
      expect(result.success).toBe(false);
    });
  });

  describe('Phone Verification', () => {
    it('should send verification code successfully', async () => {
      const result = await settingsService.sendVerificationCode('(555) 123-4567');
      expect(result).toBe(true);
    });

    it('should verify phone number with correct code', async () => {
      const phoneNumber = '(555) 123-4567';
      await settingsService.sendVerificationCode(phoneNumber);
      
      // Get the code that was generated (in real implementation this would be sent via SMS)
      const code = settingsService['verificationCodes'].get(phoneNumber);
      expect(code).toBeDefined();
      
      const result = await settingsService.verifyPhoneNumber(phoneNumber, code!);
      expect(result).toBe(true);
    });

    it('should fail verification with incorrect code', async () => {
      const phoneNumber = '(555) 123-4567';
      await settingsService.sendVerificationCode(phoneNumber);
      
      const result = await settingsService.verifyPhoneNumber(phoneNumber, '000000');
      expect(result).toBe(false);
    });

    it('should update phone verification status after successful verification', async () => {
      settingsService.setCurrentUser(2); // User with unverified phone
      const user = await settingsService.getUser(2);
      expect(user?.phoneVerified).toBe(false);
      
      const phoneNumber = user!.phone;
      await settingsService.sendVerificationCode(phoneNumber);
      const code = settingsService['verificationCodes'].get(phoneNumber);
      
      await settingsService.verifyPhoneNumber(phoneNumber, code!);
      
      const updatedUser = await settingsService.getUser(2);
      expect(updatedUser?.phoneVerified).toBe(true);
    });
  });

  describe('Blocked Clients Management', () => {
    it('should display blocked clients correctly', async () => {
      const blockedClients = await settingsService.getBlockedClients(1);
      expect(blockedClients).toHaveLength(2);
      expect(blockedClients[0].phoneNumber).toBe('(555) 999-0000');
      expect(blockedClients[0].reason).toBe('No-show multiple times');
      expect(blockedClients[1].phoneNumber).toBe('(555) 888-0000');
      expect(blockedClients[1].reason).toBe('Inappropriate behavior');
    });

    it('should unblock client successfully', async () => {
      const result = await pageHandler.unblockClient(1, '(555) 999-0000');
      expect(result).toBe(true);
      
      const blockedClients = await settingsService.getBlockedClients(1);
      expect(blockedClients).toHaveLength(1);
      expect(blockedClients[0].phoneNumber).toBe('(555) 888-0000');
    });

    it('should handle unblocking non-existent client', async () => {
      const result = await pageHandler.unblockClient(1, '(555) 000-0000');
      expect(result).toBe(false);
    });

    it('should handle blocked clients for user with no blocks', async () => {
      const blockedClients = await settingsService.getBlockedClients(2);
      expect(blockedClients).toHaveLength(0);
    });

    it('should maintain account isolation for blocked clients', async () => {
      const user1Blocked = await settingsService.getBlockedClients(1);
      const user2Blocked = await settingsService.getBlockedClients(2);
      
      expect(user1Blocked).toHaveLength(2);
      expect(user2Blocked).toHaveLength(0);
      
      // Unblock from user 1 shouldn't affect user 2
      await pageHandler.unblockClient(1, '(555) 999-0000');
      const user2BlockedAfter = await settingsService.getBlockedClients(2);
      expect(user2BlockedAfter).toHaveLength(0);
    });
  });

  describe('Stripe Integration', () => {
    it('should display Stripe status correctly for connected account', async () => {
      const stripeStatus = await settingsService.getStripeStatus(1);
      expect(stripeStatus?.connected).toBe(true);
      expect(stripeStatus?.chargesEnabled).toBe(true);
      expect(stripeStatus?.accountId).toBe('acct_123456789');
    });

    it('should display Stripe status correctly for unconnected account', async () => {
      const stripeStatus = await settingsService.getStripeStatus(2);
      expect(stripeStatus?.connected).toBe(false);
      expect(stripeStatus?.requiresOnboarding).toBe(true);
      expect(stripeStatus?.chargesEnabled).toBe(false);
    });

    it('should generate Stripe Connect onboarding URL', async () => {
      const url = await settingsService.connectStripeAccount(2);
      expect(url).toContain('https://connect.stripe.com/oauth/authorize');
      expect(url).toContain('state=2');
    });

    it('should handle Stripe status for non-existent user', async () => {
      const stripeStatus = await settingsService.getStripeStatus(999);
      expect(stripeStatus).toBeNull();
    });
  });

  describe('Subscription Management', () => {
    it('should display premium subscription status correctly', async () => {
      const subscriptionStatus = await settingsService.getSubscriptionStatus(1);
      expect(subscriptionStatus?.status).toBe('premium');
      expect(subscriptionStatus?.interval).toBe('monthly');
      expect(subscriptionStatus?.cancelAtPeriodEnd).toBe(false);
      expect(subscriptionStatus?.eligibleForRefund).toBe(true);
    });

    it('should display basic subscription status correctly', async () => {
      const subscriptionStatus = await settingsService.getSubscriptionStatus(2);
      expect(subscriptionStatus?.status).toBe('basic');
      expect(subscriptionStatus?.interval).toBeUndefined();
    });

    it('should create Stripe checkout session', async () => {
      const checkoutUrl = await settingsService.createStripeCheckoutSession(2, 'price_monthly');
      expect(checkoutUrl).toContain('https://checkout.stripe.com/pay');
      expect(checkoutUrl).toContain('price_monthly');
    });

    it('should cancel premium subscription', async () => {
      const result = await settingsService.cancelSubscription(1);
      expect(result).toBe(true);
      
      const subscriptionStatus = await settingsService.getSubscriptionStatus(1);
      expect(subscriptionStatus?.cancelAtPeriodEnd).toBe(true);
    });

    it('should fail to cancel basic subscription', async () => {
      const result = await settingsService.cancelSubscription(2);
      expect(result).toBe(false);
    });

    it('should handle subscription management for non-existent user', async () => {
      const subscriptionStatus = await settingsService.getSubscriptionStatus(999);
      expect(subscriptionStatus).toBeNull();
    });
  });

  describe('Notification Settings', () => {
    it('should display notification settings correctly', async () => {
      const settings = await settingsService.getNotificationSettings(1);
      expect(settings?.newBookingRequests).toBe(true);
      expect(settings?.appointmentConfirmations).toBe(true);
      expect(settings?.appointmentCancellations).toBe(true);
      expect(settings?.upcomingReminders).toBe(true);
      expect(settings?.soundEffects).toBe(true);
    });

    it('should update notification settings', async () => {
      const updatedSettings = await settingsService.updateNotificationSettings(1, {
        newBookingRequests: false,
        soundEffects: false
      });
      
      expect(updatedSettings?.newBookingRequests).toBe(false);
      expect(updatedSettings?.soundEffects).toBe(false);
      expect(updatedSettings?.appointmentConfirmations).toBe(true); // Unchanged
    });

    it('should handle notification settings for user with custom preferences', async () => {
      const settings = await settingsService.getNotificationSettings(2);
      expect(settings?.newBookingRequests).toBe(false);
      expect(settings?.appointmentCancellations).toBe(false);
      expect(settings?.soundEffects).toBe(false);
      expect(settings?.appointmentConfirmations).toBe(true);
      expect(settings?.upcomingReminders).toBe(true);
    });

    it('should handle notification settings for non-existent user', async () => {
      const settings = await settingsService.getNotificationSettings(999);
      expect(settings).toBeNull();
    });
  });

  describe('Help & Support', () => {
    it('should handle help support modal state', () => {
      expect(pageHandler.isHelpSupportOpen()).toBe(false);
      
      pageHandler.openHelpSupport();
      expect(pageHandler.isHelpSupportOpen()).toBe(true);
      
      pageHandler.closeHelpSupport();
      expect(pageHandler.isHelpSupportOpen()).toBe(false);
    });

    it('should handle FAQ expansion', () => {
      expect(pageHandler.getExpandedFAQ()).toBeNull();
      
      pageHandler.toggleFAQ('premium-guarantee');
      expect(pageHandler.getExpandedFAQ()).toBe('premium-guarantee');
      
      pageHandler.toggleFAQ('premium-guarantee');
      expect(pageHandler.getExpandedFAQ()).toBeNull();
      
      pageHandler.toggleFAQ('cancel-subscription');
      expect(pageHandler.getExpandedFAQ()).toBe('cancel-subscription');
    });

    it('should handle FAQ category filtering', () => {
      expect(pageHandler.getFAQCategory()).toBe('All');
      
      pageHandler.setFAQCategory('Premium & Billing');
      expect(pageHandler.getFAQCategory()).toBe('Premium & Billing');
      
      const filteredFAQs = pageHandler.filterFAQs('Premium & Billing');
      expect(filteredFAQs).toHaveLength(2);
      expect(filteredFAQs.every(faq => faq.category === 'Premium & Billing')).toBe(true);
    });

    it('should filter FAQs correctly by category', () => {
      const allFAQs = pageHandler.filterFAQs('All');
      const featureFAQs = pageHandler.filterFAQs('Features');
      const securityFAQs = pageHandler.filterFAQs('Security');
      
      expect(allFAQs).toHaveLength(5);
      expect(featureFAQs).toHaveLength(2);
      expect(securityFAQs).toHaveLength(1);
    });

    it('should provide FAQ categories', () => {
      const categories = pageHandler.getFAQCategories();
      expect(categories).toContain('All');
      expect(categories).toContain('Premium & Billing');
      expect(categories).toContain('Features');
      expect(categories).toContain('Security');
    });

    it('should submit support request successfully', async () => {
      const supportData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Support Request',
        message: 'This is a test support request message.'
      };
      
      const result = await pageHandler.submitSupportRequest(supportData);
      expect(result).toBe(true);
    });

    it('should fail support request with missing data', async () => {
      const incompleteData = {
        name: 'John Doe',
        email: '',
        subject: 'Test Subject',
        message: 'Test message'
      };
      
      const result = await pageHandler.submitSupportRequest(incompleteData);
      expect(result).toBe(false);
    });

    it('should reset help support state when closing', () => {
      pageHandler.openHelpSupport();
      pageHandler.setFAQCategory('Features');
      pageHandler.toggleFAQ('client-management');
      
      expect(pageHandler.isHelpSupportOpen()).toBe(true);
      expect(pageHandler.getFAQCategory()).toBe('Features');
      expect(pageHandler.getExpandedFAQ()).toBe('client-management');
      
      pageHandler.closeHelpSupport();
      
      expect(pageHandler.isHelpSupportOpen()).toBe(false);
      expect(pageHandler.getFAQCategory()).toBe('All');
      expect(pageHandler.getExpandedFAQ()).toBeNull();
    });
  });

  describe('Tab Management', () => {
    it('should handle tab switching correctly', () => {
      expect(pageHandler.getCurrentTab()).toBe('profile');
      
      pageHandler.switchTab('blocked');
      expect(pageHandler.getCurrentTab()).toBe('blocked');
      
      pageHandler.switchTab('profile');
      expect(pageHandler.getCurrentTab()).toBe('profile');
    });

    it('should provide correct tab count', () => {
      expect(pageHandler.getTabCount()).toBe(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      try {
        settingsService.simulateNetworkError();
        expect(true).toBe(false); // Should not reach this line
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error occurred');
      }
    });

    it('should handle empty profile updates', async () => {
      const success = await pageHandler.updateProfile(1, {});
      expect(success).toBe(true); // Empty update should still succeed
    });

    it('should handle multiple simultaneous profile updates', async () => {
      const updates = [
        pageHandler.updateProfile(1, { businessName: 'Update 1' }),
        pageHandler.updateProfile(1, { businessName: 'Update 2' }),
        pageHandler.updateProfile(1, { businessName: 'Update 3' })
      ];
      
      const results = await Promise.all(updates);
      expect(results.every(result => result === true)).toBe(true);
    });

    it('should handle large amounts of blocked clients', async () => {
      // Add many blocked clients
      const blockedClients = [];
      for (let i = 0; i < 100; i++) {
        blockedClients.push({
          id: i + 10,
          phoneNumber: `(555) ${String(i).padStart(3, '0')}-0000`,
          reason: `Test reason ${i}`,
          blockedAt: new Date()
        });
      }
      
      settingsService['blockedClients'].set(1, blockedClients);
      
      const retrievedClients = await settingsService.getBlockedClients(1);
      expect(retrievedClients).toHaveLength(100);
    });

    it('should handle concurrent blocked client operations', async () => {
      const phoneNumbers = ['(555) 999-0000', '(555) 888-0000'];
      const unblockPromises = phoneNumbers.map(phone => 
        pageHandler.unblockClient(1, phone)
      );
      
      const results = await Promise.all(unblockPromises);
      expect(results.every(result => result === true)).toBe(true);
      
      const remainingClients = await settingsService.getBlockedClients(1);
      expect(remainingClients).toHaveLength(0);
    });

    it('should handle very long form inputs', async () => {
      const longText = 'A'.repeat(1000);
      const updateData = {
        businessName: longText,
        about: longText,
        serviceArea: longText
      };
      
      const success = await pageHandler.updateProfile(1, updateData);
      expect(success).toBe(true);
      
      const updatedUser = await settingsService.getUser(1);
      expect(updatedUser?.businessName).toBe(longText);
      expect(updatedUser?.about).toBe(longText);
      expect(updatedUser?.serviceArea).toBe(longText);
    });

    it('should handle special characters in form inputs', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const updateData = {
        businessName: `Test Business ${specialChars}`,
        about: `Description with ${specialChars} characters`
      };
      
      const success = await pageHandler.updateProfile(1, updateData);
      expect(success).toBe(true);
      
      const updatedUser = await settingsService.getUser(1);
      expect(updatedUser?.businessName).toBe(`Test Business ${specialChars}`);
      expect(updatedUser?.about).toBe(`Description with ${specialChars} characters`);
    });
  });

  describe('Integration Testing', () => {
    it('should handle complete profile editing workflow', async () => {
      // Start editing
      pageHandler.startProfileEdit();
      expect(pageHandler.isProfileEditing()).toBe(true);
      
      // Update profile
      const updateData = {
        businessName: 'Complete Test Business',
        serviceArea: 'Complete Test Area',
        about: 'Complete test description',
        homeBaseAddress: '123 Complete Test St',
        timezone: 'America/Chicago',
        defaultGraceTime: 20,
        transportationMode: 'walking'
      };
      
      const success = await pageHandler.updateProfile(1, updateData);
      expect(success).toBe(true);
      expect(pageHandler.isProfileEditing()).toBe(false);
      
      // Verify updates
      const updatedUser = await settingsService.getUser(1);
      expect(updatedUser?.businessName).toBe('Complete Test Business');
      expect(updatedUser?.serviceArea).toBe('Complete Test Area');
      expect(updatedUser?.about).toBe('Complete test description');
      expect(updatedUser?.homeBaseAddress).toBe('123 Complete Test St');
      expect(updatedUser?.timezone).toBe('America/Chicago');
      expect(updatedUser?.defaultGraceTime).toBe(20);
      expect(updatedUser?.transportationMode).toBe('walking');
    });

    it('should handle complete password change workflow', async () => {
      // Start password change
      pageHandler.startPasswordChange();
      expect(pageHandler.isPasswordChanging()).toBe(true);
      
      // Change password
      const result = await pageHandler.changePassword(1, 'currentpass', 'newpassword123', 'newpassword123');
      expect(result.success).toBe(true);
      expect(pageHandler.isPasswordChanging()).toBe(false);
    });

    it('should handle complete help support workflow', async () => {
      // Open help support
      pageHandler.openHelpSupport();
      expect(pageHandler.isHelpSupportOpen()).toBe(true);
      
      // Filter FAQs
      pageHandler.setFAQCategory('Features');
      const filteredFAQs = pageHandler.filterFAQs('Features');
      expect(filteredFAQs).toHaveLength(2);
      
      // Expand FAQ
      pageHandler.toggleFAQ('client-management');
      expect(pageHandler.getExpandedFAQ()).toBe('client-management');
      
      // Submit support request
      const supportData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Integration Test',
        message: 'This is an integration test message'
      };
      
      const supportResult = await pageHandler.submitSupportRequest(supportData);
      expect(supportResult).toBe(true);
      
      // Close help support
      pageHandler.closeHelpSupport();
      expect(pageHandler.isHelpSupportOpen()).toBe(false);
      expect(pageHandler.getFAQCategory()).toBe('All');
      expect(pageHandler.getExpandedFAQ()).toBeNull();
    });

    it('should handle complete blocked clients workflow', async () => {
      // Switch to blocked clients tab
      pageHandler.switchTab('blocked');
      expect(pageHandler.getCurrentTab()).toBe('blocked');
      
      // Get initial blocked clients
      const initialBlocked = await settingsService.getBlockedClients(1);
      expect(initialBlocked).toHaveLength(2);
      
      // Unblock first client
      const unblockResult = await pageHandler.unblockClient(1, '(555) 999-0000');
      expect(unblockResult).toBe(true);
      
      // Verify client was unblocked
      const remainingBlocked = await settingsService.getBlockedClients(1);
      expect(remainingBlocked).toHaveLength(1);
      expect(remainingBlocked[0].phoneNumber).toBe('(555) 888-0000');
      
      // Switch back to profile tab
      pageHandler.switchTab('profile');
      expect(pageHandler.getCurrentTab()).toBe('profile');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid state changes efficiently', () => {
      // Rapidly toggle between tabs
      for (let i = 0; i < 100; i++) {
        pageHandler.switchTab(i % 2 === 0 ? 'profile' : 'blocked');
      }
      expect(pageHandler.getCurrentTab()).toBe('blocked'); // 99 % 2 = 1, so last iteration is 'blocked'
      
      // Rapidly toggle FAQ states
      for (let i = 0; i < 50; i++) {
        pageHandler.toggleFAQ('premium-guarantee');
      }
      expect(pageHandler.getExpandedFAQ()).toBeNull();
      
      // Rapidly toggle help support
      for (let i = 0; i < 50; i++) {
        pageHandler.openHelpSupport();
        pageHandler.closeHelpSupport();
      }
      expect(pageHandler.isHelpSupportOpen()).toBe(false);
    });

    it('should handle large user datasets efficiently', () => {
      // Create many users
      for (let i = 3; i <= 1000; i++) {
        settingsService['users'].set(i, {
          id: i,
          email: `user${i}@example.com`,
          phone: `(555) ${String(i).padStart(3, '0')}-${String(i).padStart(4, '0')}`,
          phoneVerified: i % 2 === 0,
          businessName: `Business ${i}`,
          serviceArea: `Area ${i}`,
          about: `About user ${i}`,
          homeBaseAddress: `${i} Test St`,
          timezone: 'America/New_York',
          defaultGraceTime: 5,
          transportationMode: 'driving',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      expect(settingsService.getUserCount()).toBe(1000);
      
      // Test that operations still work efficiently
      const user = settingsService.getCurrentUser();
      expect(user).toBeDefined();
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentOperations = [];
      
      // Concurrent profile updates
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          pageHandler.updateProfile(1, { businessName: `Concurrent Update ${i}` })
        );
      }
      
      // Concurrent blocked client operations
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          pageHandler.unblockClient(1, `(555) ${String(i).padStart(3, '0')}-0000`)
        );
      }
      
      // Concurrent support requests
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          pageHandler.submitSupportRequest({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            subject: `Subject ${i}`,
            message: `Message ${i}`
          })
        );
      }
      
      const results = await Promise.all(concurrentOperations);
      expect(results.length).toBe(20);
    });
  });
});