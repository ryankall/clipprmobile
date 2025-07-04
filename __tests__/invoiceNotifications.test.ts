import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data types
interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface InvoiceWithNotifications {
  id: number;
  clientId: number;
  total: string;
  sendEmail: boolean;
  sendSMS: boolean;
  emailSent: boolean;
  smsSent: boolean;
}

interface NotificationPreferences {
  sendEmail: boolean;
  sendSMS: boolean;
}

interface NotificationResult {
  emailSent: boolean;
  smsSent: boolean;
  errors: string[];
}

// Mock notification service
class MockNotificationService {
  private emailProvider: { send: (to: string, subject: string, content: string) => Promise<boolean> };
  private smsProvider: { send: (to: string, message: string) => Promise<boolean> };

  constructor() {
    this.emailProvider = {
      send: vi.fn().mockResolvedValue(true)
    };
    this.smsProvider = {
      send: vi.fn().mockResolvedValue(true)
    };
  }

  async sendInvoiceNotifications(
    client: Client,
    invoice: InvoiceWithNotifications,
    preferences: NotificationPreferences
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      emailSent: false,
      smsSent: false,
      errors: []
    };

    // Send email notification if requested and client has email
    if (preferences.sendEmail && client.email) {
      try {
        const emailContent = this.generateEmailContent(invoice, client);
        const success = await this.emailProvider.send(
          client.email,
          `Invoice #${invoice.id} - Payment Due`,
          emailContent
        );
        result.emailSent = success;
      } catch (error) {
        result.errors.push(`Email sending failed: ${error}`);
      }
    }

    // Send SMS notification if requested and client has phone
    if (preferences.sendSMS && client.phone) {
      try {
        const smsContent = this.generateSMSContent(invoice, client);
        const success = await this.smsProvider.send(client.phone, smsContent);
        result.smsSent = success;
      } catch (error) {
        result.errors.push(`SMS sending failed: ${error}`);
      }
    }

    return result;
  }

  private generateEmailContent(invoice: InvoiceWithNotifications, client: Client): string {
    return `
      Hi ${client.name},

      Your invoice #${invoice.id} is ready for payment.
      
      Total Amount: $${invoice.total}
      
      Please contact us to complete payment.
      
      Thank you!
    `;
  }

  private generateSMSContent(invoice: InvoiceWithNotifications, client: Client): string {
    return `Hi ${client.name}, your invoice #${invoice.id} for $${invoice.total} is ready. Please contact us to pay. Thanks!`;
  }
}

// Utility functions
function validateNotificationPreferences(
  client: Client,
  preferences: NotificationPreferences
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (preferences.sendEmail && !client.email) {
    errors.push('Email notification requested but client has no email address');
  }
  
  if (preferences.sendSMS && !client.phone) {
    errors.push('SMS notification requested but client has no phone number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function getAvailableNotificationMethods(client: Client): {
  email: boolean;
  sms: boolean;
  methods: string[];
} {
  const methods: string[] = [];
  const hasEmail = !!client.email;
  const hasPhone = !!client.phone;
  
  if (hasEmail) methods.push('email');
  if (hasPhone) methods.push('sms');
  
  return {
    email: hasEmail,
    sms: hasPhone,
    methods
  };
}

function calculateNotificationCost(preferences: NotificationPreferences): number {
  let cost = 0;
  
  // Mock pricing: $0.01 per email, $0.03 per SMS
  if (preferences.sendEmail) cost += 0.01;
  if (preferences.sendSMS) cost += 0.03;
  
  return cost;
}

// Tests
describe('Invoice Notification System', () => {
  let notificationService: MockNotificationService;
  
  beforeEach(() => {
    notificationService = new MockNotificationService();
  });

  describe('Notification Preferences Validation', () => {
    it('should validate email preferences correctly', () => {
      const clientWithEmail: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: false
      };
      
      const result = validateNotificationPreferences(clientWithEmail, preferences);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate SMS preferences correctly', () => {
      const clientWithPhone: Client = {
        id: 1,
        name: 'John Doe',
        phone: '555-1234'
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: false,
        sendSMS: true
      };
      
      const result = validateNotificationPreferences(clientWithPhone, preferences);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when email requested but no email available', () => {
      const clientWithoutEmail: Client = {
        id: 1,
        name: 'John Doe',
        phone: '555-1234'
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: false
      };
      
      const result = validateNotificationPreferences(clientWithoutEmail, preferences);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email notification requested but client has no email address');
    });

    it('should fail validation when SMS requested but no phone available', () => {
      const clientWithoutPhone: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: false,
        sendSMS: true
      };
      
      const result = validateNotificationPreferences(clientWithoutPhone, preferences);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMS notification requested but client has no phone number');
    });

    it('should validate multiple notification methods', () => {
      const clientWithBoth: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234'
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: true
      };
      
      const result = validateNotificationPreferences(clientWithBoth, preferences);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Available Notification Methods', () => {
    it('should detect email availability', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const available = getAvailableNotificationMethods(client);
      
      expect(available.email).toBe(true);
      expect(available.sms).toBe(false);
      expect(available.methods).toEqual(['email']);
    });

    it('should detect SMS availability', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        phone: '555-1234'
      };
      
      const available = getAvailableNotificationMethods(client);
      
      expect(available.email).toBe(false);
      expect(available.sms).toBe(true);
      expect(available.methods).toEqual(['sms']);
    });

    it('should detect both methods availability', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234'
      };
      
      const available = getAvailableNotificationMethods(client);
      
      expect(available.email).toBe(true);
      expect(available.sms).toBe(true);
      expect(available.methods).toEqual(['email', 'sms']);
    });

    it('should handle client with no contact methods', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe'
      };
      
      const available = getAvailableNotificationMethods(client);
      
      expect(available.email).toBe(false);
      expect(available.sms).toBe(false);
      expect(available.methods).toEqual([]);
    });
  });

  describe('Notification Sending', () => {
    it('should send email notification successfully', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const invoice: InvoiceWithNotifications = {
        id: 100,
        clientId: 1,
        total: '75.00',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: false
      };
      
      const result = await notificationService.sendInvoiceNotifications(client, invoice, preferences);
      
      expect(result.emailSent).toBe(true);
      expect(result.smsSent).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should send SMS notification successfully', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        phone: '555-1234'
      };
      
      const invoice: InvoiceWithNotifications = {
        id: 100,
        clientId: 1,
        total: '75.00',
        sendEmail: false,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: false,
        sendSMS: true
      };
      
      const result = await notificationService.sendInvoiceNotifications(client, invoice, preferences);
      
      expect(result.emailSent).toBe(false);
      expect(result.smsSent).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should send both email and SMS notifications', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234'
      };
      
      const invoice: InvoiceWithNotifications = {
        id: 100,
        clientId: 1,
        total: '75.00',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: true
      };
      
      const result = await notificationService.sendInvoiceNotifications(client, invoice, preferences);
      
      expect(result.emailSent).toBe(true);
      expect(result.smsSent).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing email gracefully', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        phone: '555-1234'
      };
      
      const invoice: InvoiceWithNotifications = {
        id: 100,
        clientId: 1,
        total: '75.00',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: true
      };
      
      const result = await notificationService.sendInvoiceNotifications(client, invoice, preferences);
      
      expect(result.emailSent).toBe(false);
      expect(result.smsSent).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing phone gracefully', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const invoice: InvoiceWithNotifications = {
        id: 100,
        clientId: 1,
        total: '75.00',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: true
      };
      
      const result = await notificationService.sendInvoiceNotifications(client, invoice, preferences);
      
      expect(result.emailSent).toBe(true);
      expect(result.smsSent).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Notification Cost Calculation', () => {
    it('should calculate email cost correctly', () => {
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: false
      };
      
      const cost = calculateNotificationCost(preferences);
      
      expect(cost).toBe(0.01);
    });

    it('should calculate SMS cost correctly', () => {
      const preferences: NotificationPreferences = {
        sendEmail: false,
        sendSMS: true
      };
      
      const cost = calculateNotificationCost(preferences);
      
      expect(cost).toBe(0.03);
    });

    it('should calculate combined cost correctly', () => {
      const preferences: NotificationPreferences = {
        sendEmail: true,
        sendSMS: true
      };
      
      const cost = calculateNotificationCost(preferences);
      
      expect(cost).toBe(0.04);
    });

    it('should calculate zero cost for no notifications', () => {
      const preferences: NotificationPreferences = {
        sendEmail: false,
        sendSMS: false
      };
      
      const cost = calculateNotificationCost(preferences);
      
      expect(cost).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty client data', async () => {
      const client: Client = {
        id: 1,
        name: ''
      };
      
      const invoice: InvoiceWithNotifications = {
        id: 100,
        clientId: 1,
        total: '0.00',
        sendEmail: false,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const preferences: NotificationPreferences = {
        sendEmail: false,
        sendSMS: false
      };
      
      const result = await notificationService.sendInvoiceNotifications(client, invoice, preferences);
      
      expect(result.emailSent).toBe(false);
      expect(result.smsSent).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid email format', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'invalid-email'
      };
      
      const available = getAvailableNotificationMethods(client);
      
      // Still considers it available - validation should happen at service level
      expect(available.email).toBe(true);
    });

    it('should handle invalid phone format', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        phone: 'invalid-phone'
      };
      
      const available = getAvailableNotificationMethods(client);
      
      // Still considers it available - validation should happen at service level
      expect(available.sms).toBe(true);
    });
  });
});