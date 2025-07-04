import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data types
interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Invoice {
  id: number;
  clientId: number;
  total: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod?: 'stripe' | 'apple_pay' | 'cash';
  sendEmail: boolean;
  sendSMS: boolean;
  emailSent: boolean;
  smsSent: boolean;
  stripePaymentLink?: string;
}

interface NotificationContent {
  subject: string;
  emailBody: string;
  smsBody: string;
  stripePaymentLink?: string;
}

interface DeliveryResult {
  emailDelivered: boolean;
  smsDelivered: boolean;
  paymentLinkGenerated: boolean;
  deliveryMethods: string[];
  errors: string[];
}

// Mock Stripe service
class MockStripeService {
  private apiKey: string;

  constructor(apiKey: string = 'sk_test_mock') {
    this.apiKey = apiKey;
  }

  async createPaymentLink(invoiceId: number, amount: string): Promise<string> {
    // Mock Stripe payment link generation
    const amountCents = Math.round(parseFloat(amount) * 100);
    return `https://checkout.stripe.com/pay/cs_test_${invoiceId}_${amountCents}#fidkdWxOYHwnPyd1blpxYHZxWjA0VUxLNDRqX2Y9YEREYX1kZGxHcG9Hc2BSNV1NdXFAQVNnckhxM3xnQGpLa1N3VTVMY3drS09NZ3ZZQW9TY1NfcnJycFNPVEI1PWNudU9jQXQwT11HYnQ2bEdiPScpJ3VpbGtuQH11anZgYUxhJz8ncWB2cVdeaDJgPTJrZE1ocXJhPTVqUn1iYGJ2PT1nTGZMP3NDdGZrNElqcjE1MytifQ%3D%3D`;
  }

  async retrievePaymentLink(paymentLinkId: string): Promise<{ status: string; amount: number }> {
    return {
      status: 'active',
      amount: 7500 // Mock amount in cents
    };
  }
}

// Mock email service
class MockEmailService {
  private provider: string;

  constructor(provider: string = 'sendgrid') {
    this.provider = provider;
  }

  async sendInvoiceEmail(
    to: string,
    subject: string,
    content: string,
    paymentLink?: string
  ): Promise<boolean> {
    // Mock email sending with payment link validation
    if (!to || !subject || !content) {
      throw new Error('Missing required email parameters');
    }

    // Simulate email delivery
    return true;
  }
}

// Mock SMS service
class MockSMSService {
  private provider: string;

  constructor(provider: string = 'twilio') {
    this.provider = provider;
  }

  async sendInvoiceSMS(
    to: string,
    message: string,
    paymentLink?: string
  ): Promise<boolean> {
    // Mock SMS sending with payment link validation
    if (!to || !message) {
      throw new Error('Missing required SMS parameters');
    }

    // Simulate SMS delivery
    return true;
  }
}

// Main invoice delivery service
class InvoiceDeliveryService {
  private stripeService: MockStripeService;
  private emailService: MockEmailService;
  private smsService: MockSMSService;

  constructor() {
    this.stripeService = new MockStripeService();
    this.emailService = new MockEmailService();
    this.smsService = new MockSMSService();
  }

  async deliverInvoice(
    client: Client,
    invoice: Invoice
  ): Promise<DeliveryResult> {
    const result: DeliveryResult = {
      emailDelivered: false,
      smsDelivered: false,
      paymentLinkGenerated: false,
      deliveryMethods: [],
      errors: []
    };

    try {
      // Generate Stripe payment link for card payments
      let paymentLink: string | undefined;
      if (invoice.paymentMethod === 'stripe' || !invoice.paymentMethod) {
        paymentLink = await this.stripeService.createPaymentLink(
          invoice.id,
          invoice.total
        );
        result.paymentLinkGenerated = true;
      }

      // Prepare notification content
      const content = this.generateNotificationContent(invoice, client, paymentLink);

      // Send email if requested and client has email
      if (invoice.sendEmail) {
        if (client.email && client.email.trim() !== '') {
          try {
            const emailSent = await this.emailService.sendInvoiceEmail(
              client.email,
              content.subject,
              content.emailBody,
              paymentLink
            );
            result.emailDelivered = emailSent;
            if (emailSent) {
              result.deliveryMethods.push('email');
            }
          } catch (error) {
            result.errors.push(`Email delivery failed: ${error}`);
          }
        } else {
          result.errors.push('Email delivery requested but client has no valid email address');
        }
      }

      // Send SMS if requested and client has phone
      if (invoice.sendSMS) {
        if (client.phone && client.phone.trim() !== '') {
          try {
            const smsSent = await this.smsService.sendInvoiceSMS(
              client.phone,
              content.smsBody,
              paymentLink
            );
            result.smsDelivered = smsSent;
            if (smsSent) {
              result.deliveryMethods.push('sms');
            }
          } catch (error) {
            result.errors.push(`SMS delivery failed: ${error}`);
          }
        } else {
          result.errors.push('SMS delivery requested but client has no valid phone number');
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Invoice delivery failed: ${error}`);
      return result;
    }
  }

  private generateNotificationContent(
    invoice: Invoice,
    client: Client,
    paymentLink?: string
  ): NotificationContent {
    const paymentInstructions = this.getPaymentInstructions(invoice.paymentMethod, paymentLink);

    return {
      subject: `Invoice #${invoice.id} - Payment Due ($${invoice.total})`,
      emailBody: `
        Hi ${client.name},

        Your invoice #${invoice.id} is ready for payment.
        
        Amount Due: $${invoice.total}
        
        ${paymentInstructions.email}
        
        Thank you for your business!
      `,
      smsBody: `Hi ${client.name}, invoice #${invoice.id} for $${invoice.total} is ready. ${paymentInstructions.sms}`,
      stripePaymentLink: paymentLink
    };
  }

  private getPaymentInstructions(
    paymentMethod?: string,
    paymentLink?: string
  ): { email: string; sms: string } {
    switch (paymentMethod) {
      case 'stripe':
        return {
          email: paymentLink 
            ? `Click here to pay with card: ${paymentLink}`
            : 'Please contact us to arrange card payment.',
          sms: paymentLink 
            ? `Pay here: ${paymentLink}`
            : 'Contact us to pay by card.'
        };
      case 'apple_pay':
        return {
          email: 'Apple Pay will be available during your next appointment.',
          sms: 'Apple Pay available at next appointment.'
        };
      case 'cash':
        return {
          email: 'Please bring cash payment to your next appointment.',
          sms: 'Bring cash to next appointment.'
        };
      default:
        return {
          email: paymentLink 
            ? `Pay online: ${paymentLink} or contact us for other payment options.`
            : 'Please contact us to arrange payment.',
          sms: paymentLink 
            ? `Pay: ${paymentLink}`
            : 'Contact us to pay.'
        };
    }
  }
}

// Utility functions
function validateInvoiceDelivery(
  client: Client,
  invoice: Invoice
): { canDeliver: boolean; availableMethods: string[]; errors: string[] } {
  const errors: string[] = [];
  const availableMethods: string[] = [];

  if (invoice.sendEmail) {
    if (client.email) {
      availableMethods.push('email');
    } else {
      errors.push('Email delivery requested but client has no email address');
    }
  }

  if (invoice.sendSMS) {
    if (client.phone) {
      availableMethods.push('sms');
    } else {
      errors.push('SMS delivery requested but client has no phone number');
    }
  }

  return {
    canDeliver: availableMethods.length > 0,
    availableMethods,
    errors
  };
}

function calculateDeliveryCost(
  invoice: Invoice,
  deliveryMethods: string[]
): number {
  let cost = 0;
  
  // Mock pricing
  if (deliveryMethods.includes('email')) cost += 0.01;
  if (deliveryMethods.includes('sms')) cost += 0.03;
  
  // Stripe processing fee (2.9% + $0.30)
  if (invoice.paymentMethod === 'stripe') {
    const amount = parseFloat(invoice.total);
    cost += (amount * 0.029) + 0.30;
  }
  
  return Math.round(cost * 100) / 100; // Round to 2 decimal places
}

// Tests
describe('Invoice Delivery System', () => {
  let deliveryService: InvoiceDeliveryService;
  
  beforeEach(() => {
    deliveryService = new InvoiceDeliveryService();
  });

  describe('Stripe Payment Link Generation', () => {
    it('should generate payment link for stripe payment method', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '75.00',
        status: 'pending',
        paymentMethod: 'stripe',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.paymentLinkGenerated).toBe(true);
      expect(result.emailDelivered).toBe(true);
      expect(result.deliveryMethods).toContain('email');
    });

    it('should generate payment link for undefined payment method (default to stripe)', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '50.00',
        status: 'pending',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.paymentLinkGenerated).toBe(true);
      expect(result.emailDelivered).toBe(true);
    });

    it('should not generate payment link for cash payment method', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '30.00',
        status: 'pending',
        paymentMethod: 'cash',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.paymentLinkGenerated).toBe(false);
      expect(result.emailDelivered).toBe(true);
      expect(result.deliveryMethods).toContain('email');
    });
  });

  describe('Email Delivery with Payment Links', () => {
    it('should send email with stripe payment link', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '85.00',
        status: 'pending',
        paymentMethod: 'stripe',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.emailDelivered).toBe(true);
      expect(result.paymentLinkGenerated).toBe(true);
      expect(result.deliveryMethods).toEqual(['email']);
      expect(result.errors).toHaveLength(0);
    });

    it('should send email with cash payment instructions', async () => {
      const client: Client = {
        id: 1,
        name: 'Jane Doe',
        email: 'jane@example.com'
      };
      
      const invoice: Invoice = {
        id: 101,
        clientId: 1,
        total: '40.00',
        status: 'pending',
        paymentMethod: 'cash',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.emailDelivered).toBe(true);
      expect(result.paymentLinkGenerated).toBe(false);
      expect(result.deliveryMethods).toEqual(['email']);
    });

    it('should handle email delivery failure gracefully', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: '' // Invalid email
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '75.00',
        status: 'pending',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.emailDelivered).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('SMS Delivery with Payment Links', () => {
    it('should send SMS with stripe payment link', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        phone: '555-1234'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '60.00',
        status: 'pending',
        paymentMethod: 'stripe',
        sendEmail: false,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.smsDelivered).toBe(true);
      expect(result.paymentLinkGenerated).toBe(true);
      expect(result.deliveryMethods).toEqual(['sms']);
      expect(result.errors).toHaveLength(0);
    });

    it('should send SMS with cash payment instructions', async () => {
      const client: Client = {
        id: 1,
        name: 'Jane Doe',
        phone: '555-5678'
      };
      
      const invoice: Invoice = {
        id: 101,
        clientId: 1,
        total: '35.00',
        status: 'pending',
        paymentMethod: 'cash',
        sendEmail: false,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.smsDelivered).toBe(true);
      expect(result.paymentLinkGenerated).toBe(false);
      expect(result.deliveryMethods).toEqual(['sms']);
    });
  });

  describe('Multi-Method Delivery', () => {
    it('should send to both email and SMS with stripe payment link', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '95.00',
        status: 'pending',
        paymentMethod: 'stripe',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.emailDelivered).toBe(true);
      expect(result.smsDelivered).toBe(true);
      expect(result.paymentLinkGenerated).toBe(true);
      expect(result.deliveryMethods).toEqual(['email', 'sms']);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial delivery when one method fails', async () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '' // Invalid phone
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '70.00',
        status: 'pending',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const result = await deliveryService.deliverInvoice(client, invoice);
      
      expect(result.emailDelivered).toBe(true);
      expect(result.smsDelivered).toBe(false);
      expect(result.deliveryMethods).toEqual(['email']);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Delivery Validation', () => {
    it('should validate delivery capabilities correctly', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '50.00',
        status: 'pending',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const validation = validateInvoiceDelivery(client, invoice);
      
      expect(validation.canDeliver).toBe(true);
      expect(validation.availableMethods).toEqual(['email', 'sms']);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing contact methods', () => {
      const client: Client = {
        id: 1,
        name: 'John Doe'
      };
      
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '50.00',
        status: 'pending',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const validation = validateInvoiceDelivery(client, invoice);
      
      expect(validation.canDeliver).toBe(false);
      expect(validation.availableMethods).toHaveLength(0);
      expect(validation.errors).toHaveLength(2);
    });
  });

  describe('Delivery Cost Calculation', () => {
    it('should calculate email delivery cost', () => {
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '50.00',
        status: 'pending',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const cost = calculateDeliveryCost(invoice, ['email']);
      
      expect(cost).toBe(0.01);
    });

    it('should calculate SMS delivery cost', () => {
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '50.00',
        status: 'pending',
        sendEmail: false,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const cost = calculateDeliveryCost(invoice, ['sms']);
      
      expect(cost).toBe(0.03);
    });

    it('should calculate stripe processing fees', () => {
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '100.00',
        status: 'pending',
        paymentMethod: 'stripe',
        sendEmail: true,
        sendSMS: false,
        emailSent: false,
        smsSent: false
      };
      
      const cost = calculateDeliveryCost(invoice, ['email']);
      
      // $0.01 (email) + $2.90 (2.9% of $100) + $0.30 (stripe fee) = $3.21
      expect(cost).toBe(3.21);
    });

    it('should calculate combined costs', () => {
      const invoice: Invoice = {
        id: 100,
        clientId: 1,
        total: '50.00',
        status: 'pending',
        paymentMethod: 'stripe',
        sendEmail: true,
        sendSMS: true,
        emailSent: false,
        smsSent: false
      };
      
      const cost = calculateDeliveryCost(invoice, ['email', 'sms']);
      
      // $0.01 (email) + $0.03 (sms) + $1.45 (2.9% of $50) + $0.30 (stripe fee) = $1.79
      expect(cost).toBe(1.79);
    });
  });
});