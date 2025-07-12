import { describe, it, expect, beforeEach } from 'vitest';

// Types for mobile invoice notification system
interface MobileClient {
  id: number;
  name: string;
  phone: string;
  email?: string;
  mobilePreferred: boolean;
  notificationPreferences: {
    sms: boolean;
    email: boolean;
    pushNotifications: boolean;
  };
}

interface MobileInvoice {
  id: number;
  clientId: number;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  services: string[];
  mobilePaymentEnabled: boolean;
  qrCodeGenerated: boolean;
}

interface MobileNotificationSettings {
  enabled: boolean;
  types: {
    invoiceCreated: boolean;
    paymentReminder: boolean;
    paymentReceived: boolean;
    overdueNotice: boolean;
  };
  delivery: {
    sms: boolean;
    email: boolean;
    pushNotification: boolean;
  };
  mobileOptimized: boolean;
}

interface MobileSentNotification {
  id: number;
  invoiceId: number;
  clientId: number;
  type: 'invoice_created' | 'payment_reminder' | 'payment_received' | 'overdue_notice';
  method: 'sms' | 'email' | 'push';
  content: string;
  sentAt: Date;
  mobileFormat: boolean;
  delivered: boolean;
}

// Mock mobile invoice notification service
class MockMobileInvoiceNotificationService {
  private clients: MobileClient[] = [];
  private invoices: MobileInvoice[] = [];
  private notificationSettings: MobileNotificationSettings;
  private sentNotifications: MobileSentNotification[] = [];
  private nextId = 1;

  constructor() {
    this.notificationSettings = {
      enabled: true,
      types: {
        invoiceCreated: true,
        paymentReminder: true,
        paymentReceived: true,
        overdueNotice: true
      },
      delivery: {
        sms: true,
        email: true,
        pushNotification: true
      },
      mobileOptimized: true
    };
    this.setupMockData();
  }

  private setupMockData(): void {
    this.clients = [
      {
        id: 1,
        name: 'Mobile Client A',
        phone: '(555) 111-1111',
        email: 'clienta@mobile.com',
        mobilePreferred: true,
        notificationPreferences: {
          sms: true,
          email: true,
          pushNotifications: true
        }
      },
      {
        id: 2,
        name: 'Mobile Client B',
        phone: '(555) 222-2222',
        mobilePreferred: true,
        notificationPreferences: {
          sms: true,
          email: false,
          pushNotifications: true
        }
      },
      {
        id: 3,
        name: 'Mobile Client C',
        phone: '(555) 333-3333',
        email: 'clientc@mobile.com',
        mobilePreferred: false,
        notificationPreferences: {
          sms: false,
          email: true,
          pushNotifications: false
        }
      }
    ];
    this.nextId = 4;
  }

  async createMobileInvoice(invoiceData: {
    clientId: number;
    amount: number;
    services: string[];
    dueDate: string;
  }): Promise<MobileInvoice> {
    const invoice: MobileInvoice = {
      id: this.nextId++,
      clientId: invoiceData.clientId,
      amount: invoiceData.amount,
      status: 'pending',
      dueDate: invoiceData.dueDate,
      services: invoiceData.services,
      mobilePaymentEnabled: true,
      qrCodeGenerated: true
    };

    this.invoices.push(invoice);

    // Send mobile invoice creation notification
    if (this.notificationSettings.enabled && this.notificationSettings.types.invoiceCreated) {
      await this.sendMobileInvoiceNotification(invoice, 'invoice_created');
    }

    return invoice;
  }

  async sendMobileInvoiceNotification(
    invoice: MobileInvoice,
    type: 'invoice_created' | 'payment_reminder' | 'payment_received' | 'overdue_notice'
  ): Promise<MobileSentNotification[]> {
    const client = this.clients.find(c => c.id === invoice.clientId);
    if (!client) throw new Error('Client not found');

    const notifications: MobileSentNotification[] = [];
    const content = this.generateMobileNotificationContent(invoice, type, client);

    // Determine which mobile methods to use based on client preferences
    const methods: ('sms' | 'email' | 'push')[] = [];
    
    if (client.notificationPreferences.sms && this.notificationSettings.delivery.sms) {
      methods.push('sms');
    }
    if (client.notificationPreferences.email && this.notificationSettings.delivery.email && client.email) {
      methods.push('email');
    }
    if (client.notificationPreferences.pushNotifications && this.notificationSettings.delivery.pushNotification) {
      methods.push('push');
    }

    // Send notification via each enabled mobile method
    for (const method of methods) {
      const notification: MobileSentNotification = {
        id: this.nextId++,
        invoiceId: invoice.id,
        clientId: client.id,
        type,
        method,
        content: this.formatMobileContent(content, method),
        sentAt: new Date(),
        mobileFormat: true,
        delivered: true // Assume successful delivery for testing
      };

      this.sentNotifications.push(notification);
      notifications.push(notification);
    }

    return notifications;
  }

  private generateMobileNotificationContent(
    invoice: MobileInvoice,
    type: string,
    client: MobileClient
  ): string {
    const baseMessages = {
      invoice_created: `Hi ${client.name}! New mobile invoice #${invoice.id} for $${invoice.amount} is ready. Services: ${invoice.services.join(', ')}. Tap to pay instantly.`,
      payment_reminder: `Reminder: Mobile invoice #${invoice.id} ($${invoice.amount}) is due soon. Pay now with one tap!`,
      payment_received: `Payment received! Thank you ${client.name}. Invoice #${invoice.id} is now paid. See you next time!`,
      overdue_notice: `OVERDUE: Mobile invoice #${invoice.id} ($${invoice.amount}) needs immediate attention. Please pay now.`
    };

    return baseMessages[type as keyof typeof baseMessages] || 'Mobile invoice notification';
  }

  private formatMobileContent(content: string, method: 'sms' | 'email' | 'push'): string {
    switch (method) {
      case 'sms':
        // Mobile SMS format - shorter, more direct
        return content.length > 160 ? content.substring(0, 157) + '...' : content;
      case 'email':
        // Mobile email format with mobile-friendly HTML
        return `<div style="font-family: Arial; font-size: 16px; line-height: 1.5; max-width: 600px;">
          <h2 style="color: #F59E0B;">Clippr Mobile Invoice</h2>
          <p>${content}</p>
          <a href="#" style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Pay Now</a>
        </div>`;
      case 'push':
        // Mobile push notification format - very short
        return content.length > 100 ? content.substring(0, 97) + '...' : content;
      default:
        return content;
    }
  }

  async markMobileInvoiceAsPaid(invoiceId: number): Promise<void> {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    invoice.status = 'paid';

    // Send mobile payment confirmation
    if (this.notificationSettings.enabled && this.notificationSettings.types.paymentReceived) {
      await this.sendMobileInvoiceNotification(invoice, 'payment_received');
    }
  }

  async sendMobilePaymentReminders(): Promise<number> {
    let remindersSent = 0;
    const pendingInvoices = this.invoices.filter(i => i.status === 'pending');

    for (const invoice of pendingInvoices) {
      // Check if reminder was already sent recently
      const recentReminder = this.sentNotifications.find(n =>
        n.invoiceId === invoice.id &&
        n.type === 'payment_reminder' &&
        (new Date().getTime() - n.sentAt.getTime()) < 24 * 60 * 60 * 1000 // 24 hours
      );

      if (!recentReminder && this.notificationSettings.types.paymentReminder) {
        await this.sendMobileInvoiceNotification(invoice, 'payment_reminder');
        remindersSent++;
      }
    }

    return remindersSent;
  }

  async sendMobileOverdueNotices(): Promise<number> {
    let overdueNoticesSent = 0;
    const overdueInvoices = this.invoices.filter(i => {
      if (i.status !== 'pending') return false;
      const dueDate = new Date(i.dueDate);
      return new Date() > dueDate;
    });

    for (const invoice of overdueInvoices) {
      invoice.status = 'overdue';
      
      if (this.notificationSettings.types.overdueNotice) {
        await this.sendMobileInvoiceNotification(invoice, 'overdue_notice');
        overdueNoticesSent++;
      }
    }

    return overdueNoticesSent;
  }

  updateMobileNotificationSettings(settings: Partial<MobileNotificationSettings>): void {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
  }

  getMobileNotificationHistory(clientId?: number): MobileSentNotification[] {
    if (clientId) {
      return this.sentNotifications.filter(n => n.clientId === clientId && n.mobileFormat);
    }
    return this.sentNotifications.filter(n => n.mobileFormat);
  }

  getMobileNotificationStats(): {
    totalSent: number;
    byMethod: { sms: number; email: number; push: number };
    byType: { invoice_created: number; payment_reminder: number; payment_received: number; overdue_notice: number };
    deliveryRate: number;
  } {
    const mobileNotifications = this.sentNotifications.filter(n => n.mobileFormat);
    const totalSent = mobileNotifications.length;
    const delivered = mobileNotifications.filter(n => n.delivered).length;

    const byMethod = {
      sms: mobileNotifications.filter(n => n.method === 'sms').length,
      email: mobileNotifications.filter(n => n.method === 'email').length,
      push: mobileNotifications.filter(n => n.method === 'push').length
    };

    const byType = {
      invoice_created: mobileNotifications.filter(n => n.type === 'invoice_created').length,
      payment_reminder: mobileNotifications.filter(n => n.type === 'payment_reminder').length,
      payment_received: mobileNotifications.filter(n => n.type === 'payment_received').length,
      overdue_notice: mobileNotifications.filter(n => n.type === 'overdue_notice').length
    };

    return {
      totalSent,
      byMethod,
      byType,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0
    };
  }

  // Test helper methods
  clearMobileData(): void {
    this.invoices = [];
    this.sentNotifications = [];
    this.nextId = 1;
  }

  addMobileTestClient(client: Omit<MobileClient, 'id'>): MobileClient {
    const newClient: MobileClient = {
      id: this.nextId++,
      ...client
    };
    this.clients.push(newClient);
    return newClient;
  }

  getMobileInvoices(): MobileInvoice[] {
    return this.invoices.filter(i => i.mobilePaymentEnabled);
  }
}

describe('Mobile Invoice Notification System', () => {
  let mobileNotificationService: MockMobileInvoiceNotificationService;

  beforeEach(() => {
    mobileNotificationService = new MockMobileInvoiceNotificationService();
    mobileNotificationService.clearMobileData();
  });

  describe('Mobile Invoice Creation Notifications', () => {
    it('should send mobile notification when invoice is created', async () => {
      const invoice = await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 50.00,
        services: ['Mobile Cut', 'Mobile Beard Trim'],
        dueDate: '2025-07-20'
      });

      expect(invoice.mobilePaymentEnabled).toBe(true);
      expect(invoice.qrCodeGenerated).toBe(true);

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.every(n => n.mobileFormat)).toBe(true);
      expect(notifications.some(n => n.type === 'invoice_created')).toBe(true);
    });

    it('should send mobile notifications via multiple methods based on client preferences', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 1, // Client with SMS, email, and push enabled
        amount: 75.00,
        services: ['Mobile Premium Service'],
        dueDate: '2025-07-25'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory(1);
      const methods = notifications.map(n => n.method);
      
      expect(methods).toContain('sms');
      expect(methods).toContain('email');
      expect(methods).toContain('push');
    });

    it('should respect mobile client notification preferences', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 2, // Client with SMS and push enabled, email disabled
        amount: 40.00,
        services: ['Mobile Basic Cut'],
        dueDate: '2025-07-18'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory(2);
      const methods = notifications.map(n => n.method);
      
      expect(methods).toContain('sms');
      expect(methods).toContain('push');
      expect(methods).not.toContain('email');
    });
  });

  describe('Mobile Payment Confirmation Notifications', () => {
    it('should send mobile payment confirmation when invoice is paid', async () => {
      const invoice = await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 60.00,
        services: ['Mobile Style', 'Mobile Treatment'],
        dueDate: '2025-07-22'
      });

      await mobileNotificationService.markMobileInvoiceAsPaid(invoice.id);

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      const paymentNotifications = notifications.filter(n => n.type === 'payment_received');
      
      expect(paymentNotifications.length).toBeGreaterThan(0);
      expect(paymentNotifications.every(n => n.mobileFormat)).toBe(true);
      expect(invoice.status).toBe('paid');
    });
  });

  describe('Mobile Payment Reminders', () => {
    it('should send mobile payment reminders for pending invoices', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 45.00,
        services: ['Mobile Trim'],
        dueDate: '2025-07-19'
      });

      const remindersSent = await mobileNotificationService.sendMobilePaymentReminders();

      expect(remindersSent).toBe(1);

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      const reminderNotifications = notifications.filter(n => n.type === 'payment_reminder');
      
      expect(reminderNotifications.length).toBeGreaterThan(0);
      expect(reminderNotifications.every(n => n.mobileFormat)).toBe(true);
    });

    it('should not send duplicate mobile reminders within 24 hours', async () => {
      const invoice = await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 30.00,
        services: ['Mobile Quick Cut'],
        dueDate: '2025-07-21'
      });

      // Send first reminder
      await mobileNotificationService.sendMobilePaymentReminders();
      
      // Try to send another reminder immediately
      const secondRemindersSent = await mobileNotificationService.sendMobilePaymentReminders();

      expect(secondRemindersSent).toBe(0);
    });
  });

  describe('Mobile Overdue Notices', () => {
    it('should send mobile overdue notices for past due invoices', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 55.00,
        services: ['Mobile Full Service'],
        dueDate: '2025-07-10' // Past due date
      });

      const overdueNoticesSent = await mobileNotificationService.sendMobileOverdueNotices();

      expect(overdueNoticesSent).toBe(1);

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      const overdueNotifications = notifications.filter(n => n.type === 'overdue_notice');
      
      expect(overdueNotifications.length).toBeGreaterThan(0);
      expect(overdueNotifications.every(n => n.mobileFormat)).toBe(true);
    });

    it('should update invoice status to overdue when sending mobile notices', async () => {
      const invoice = await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 65.00,
        services: ['Mobile Deluxe Package'],
        dueDate: '2025-07-05' // Past due
      });

      await mobileNotificationService.sendMobileOverdueNotices();

      const updatedInvoice = mobileNotificationService.getMobileInvoices().find(i => i.id === invoice.id);
      expect(updatedInvoice?.status).toBe('overdue');
    });
  });

  describe('Mobile Content Formatting', () => {
    it('should format mobile SMS content with character limits', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 100.00,
        services: ['Very Long Service Name That Exceeds Normal Limits', 'Another Long Service'],
        dueDate: '2025-07-30'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      const smsNotifications = notifications.filter(n => n.method === 'sms');
      
      expect(smsNotifications.every(n => n.content.length <= 160)).toBe(true);
    });

    it('should format mobile email content with HTML for mobile viewing', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 85.00,
        services: ['Mobile Styling'],
        dueDate: '2025-07-28'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      const emailNotifications = notifications.filter(n => n.method === 'email');
      
      expect(emailNotifications.every(n => n.content.includes('<div'))).toBe(true);
      expect(emailNotifications.every(n => n.content.includes('Clippr Mobile Invoice'))).toBe(true);
    });

    it('should format mobile push notifications with length limits', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 70.00,
        services: ['Mobile Push Test Service'],
        dueDate: '2025-07-26'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      const pushNotifications = notifications.filter(n => n.method === 'push');
      
      expect(pushNotifications.every(n => n.content.length <= 100)).toBe(true);
    });
  });

  describe('Mobile Notification Settings', () => {
    it('should respect mobile notification type settings', async () => {
      mobileNotificationService.updateMobileNotificationSettings({
        types: {
          invoiceCreated: false,
          paymentReminder: true,
          paymentReceived: true,
          overdueNotice: true
        }
      });

      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 35.00,
        services: ['Mobile Test'],
        dueDate: '2025-07-24'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      expect(notifications.filter(n => n.type === 'invoice_created').length).toBe(0);
    });

    it('should respect mobile delivery method settings', async () => {
      mobileNotificationService.updateMobileNotificationSettings({
        delivery: {
          sms: false,
          email: true,
          pushNotification: true
        }
      });

      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 42.00,
        services: ['Mobile Delivery Test'],
        dueDate: '2025-07-27'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory();
      const methods = notifications.map(n => n.method);
      
      expect(methods).not.toContain('sms');
      expect(methods).toContain('email');
      expect(methods).toContain('push');
    });
  });

  describe('Mobile Notification Statistics', () => {
    it('should track mobile notification statistics accurately', async () => {
      await mobileNotificationService.createMobileInvoice({
        clientId: 1,
        amount: 50.00,
        services: ['Mobile Stats Test'],
        dueDate: '2025-07-29'
      });

      await mobileNotificationService.sendMobilePaymentReminders();

      const stats = mobileNotificationService.getMobileNotificationStats();
      
      expect(stats.totalSent).toBeGreaterThan(0);
      expect(stats.byMethod.sms).toBeGreaterThan(0);
      expect(stats.byMethod.email).toBeGreaterThan(0);
      expect(stats.byMethod.push).toBeGreaterThan(0);
      expect(stats.byType.invoice_created).toBeGreaterThan(0);
      expect(stats.deliveryRate).toBe(100); // All test notifications are delivered
    });
  });

  describe('Mobile Client Management', () => {
    it('should handle mobile clients with different notification preferences', async () => {
      const mobileOnlyClient = mobileNotificationService.addMobileTestClient({
        name: 'Mobile Only Client',
        phone: '(555) 999-8888',
        mobilePreferred: true,
        notificationPreferences: {
          sms: true,
          email: false,
          pushNotifications: true
        }
      });

      await mobileNotificationService.createMobileInvoice({
        clientId: mobileOnlyClient.id,
        amount: 38.00,
        services: ['Mobile Only Service'],
        dueDate: '2025-07-31'
      });

      const notifications = mobileNotificationService.getMobileNotificationHistory(mobileOnlyClient.id);
      const methods = notifications.map(n => n.method);
      
      expect(methods).toContain('sms');
      expect(methods).toContain('push');
      expect(methods).not.toContain('email');
    });
  });
});