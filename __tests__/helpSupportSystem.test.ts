import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types for help and support system
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  isVisible: boolean;
}

interface SupportTicket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

interface EmailTemplate {
  id: string;
  type: 'support_request' | 'auto_reply' | 'resolution';
  subject: string;
  body: string;
  variables: string[];
}

class MockHelpSupportService {
  private faqs: FAQItem[] = [];
  private supportTickets: SupportTicket[] = [];
  private emailTemplates: EmailTemplate[] = [];

  constructor() {
    this.setupDefaultFAQs();
    this.setupEmailTemplates();
  }

  private setupDefaultFAQs(): void {
    this.faqs = [
      {
        id: 'premium-guarantee',
        question: 'What is the Premium Guarantee?',
        answer: 'Try Clippr Pro risk-free for 30 days. If you\'re not satisfied, request a full refund — no hassle. You can also cancel your subscription anytime directly from the Settings page.',
        category: 'Premium & Billing',
        isVisible: true
      },
      {
        id: 'cancel-subscription',
        question: 'How do I cancel my subscription?',
        answer: 'You can cancel your Premium subscription anytime from Settings → Subscription Management. Your premium access will continue until the end of your current billing period.',
        category: 'Premium & Billing',
        isVisible: true
      },
      {
        id: 'refund-policy',
        question: 'How do I request a refund?',
        answer: 'If you\'re within your first 30 days of Premium, you can request a full refund from Settings → Subscription Management. The refund will be processed immediately and you\'ll be downgraded to Basic plan.',
        category: 'Premium & Billing',
        isVisible: true
      },
      {
        id: 'appointment-limits',
        question: 'What are the appointment limits?',
        answer: 'Basic plan allows 15 appointments per month. Premium plan offers unlimited appointments. The counter resets on the first day of each month.',
        category: 'Features',
        isVisible: true
      },
      {
        id: 'data-security',
        question: 'Is my data secure?',
        answer: 'Yes, we use industry-standard encryption and security measures. Your client data and payment information are protected with bank-level security.',
        category: 'Security',
        isVisible: true
      }
    ];
  }

  private setupEmailTemplates(): void {
    this.emailTemplates = [
      {
        id: 'support-auto-reply',
        type: 'auto_reply',
        subject: 'We received your support request - Ticket #{ticketId}',
        body: 'Hi {name},\n\nThank you for contacting Clippr support. We\'ve received your request about "{subject}" and will respond within 24 hours during business days.\n\nTicket ID: #{ticketId}\n\nBest regards,\nClippr Support Team',
        variables: ['name', 'subject', 'ticketId']
      },
      {
        id: 'support-resolution',
        type: 'resolution',
        subject: 'Your support ticket has been resolved - #{ticketId}',
        body: 'Hi {name},\n\nYour support ticket #{ticketId} regarding "{subject}" has been resolved.\n\nIf you have any additional questions, please don\'t hesitate to contact us.\n\nBest regards,\nClippr Support Team',
        variables: ['name', 'subject', 'ticketId']
      }
    ];
  }

  getFAQsByCategory(category: string): FAQItem[] {
    if (category === 'All') {
      return this.faqs.filter(faq => faq.isVisible);
    }
    return this.faqs.filter(faq => faq.category === category && faq.isVisible);
  }

  searchFAQs(query: string): FAQItem[] {
    const searchTerm = query.toLowerCase();
    return this.faqs.filter(faq => 
      faq.isVisible && (
        faq.question.toLowerCase().includes(searchTerm) ||
        faq.answer.toLowerCase().includes(searchTerm)
      )
    );
  }

  createSupportTicket(ticketData: Omit<SupportTicket, 'id' | 'status' | 'priority' | 'createdAt' | 'updatedAt'>): SupportTicket {
    const ticket: SupportTicket = {
      id: `TICKET_${Date.now()}`,
      ...ticketData,
      status: 'open',
      priority: this.determinePriority(ticketData.subject, ticketData.message),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.supportTickets.push(ticket);
    return ticket;
  }

  private determinePriority(subject: string, message: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap', 'immediately'];
    const highKeywords = ['refund', 'billing', 'payment', 'subscription', 'cannot access'];
    
    const text = (subject + ' ' + message).toLowerCase();
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    
    if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  generateEmailFromTemplate(templateId: string, variables: Record<string, string>): { subject: string; body: string } {
    const template = this.emailTemplates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let subject = template.subject;
    let body = template.body;

    // Replace variables in subject and body
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, body };
  }

  validateSupportForm(formData: { name: string; email: string; subject: string; message: string }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!formData.email || !this.isValidEmail(formData.email)) {
      errors.push('Please provide a valid email address');
    }

    if (!formData.subject || formData.subject.trim().length < 5) {
      errors.push('Subject must be at least 5 characters long');
    }

    if (!formData.message || formData.message.trim().length < 10) {
      errors.push('Message must be at least 10 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getTicketById(id: string): SupportTicket | null {
    return this.supportTickets.find(ticket => ticket.id === id) || null;
  }

  updateTicketStatus(id: string, status: 'open' | 'in_progress' | 'resolved'): boolean {
    const ticket = this.getTicketById(id);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date();
      return true;
    }
    return false;
  }

  getTicketsByStatus(status: 'open' | 'in_progress' | 'resolved'): SupportTicket[] {
    return this.supportTickets.filter(ticket => ticket.status === status);
  }

  generateMailtoLink(formData: { name: string; email: string; subject: string; message: string }): string {
    const emailBody = `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`;
    return `mailto:customersupport@kall-e.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(emailBody)}`;
  }
}

describe('Help & Support System', () => {
  let helpSupportService: MockHelpSupportService;

  beforeEach(() => {
    helpSupportService = new MockHelpSupportService();
  });

  describe('FAQ Management', () => {
    it('should return all visible FAQs when category is "All"', () => {
      const faqs = helpSupportService.getFAQsByCategory('All');
      
      expect(faqs).toHaveLength(5);
      expect(faqs.every(faq => faq.isVisible)).toBe(true);
    });

    it('should filter FAQs by category correctly', () => {
      const billingFAQs = helpSupportService.getFAQsByCategory('Premium & Billing');
      const featureFAQs = helpSupportService.getFAQsByCategory('Features');
      const securityFAQs = helpSupportService.getFAQsByCategory('Security');
      
      expect(billingFAQs).toHaveLength(3);
      expect(featureFAQs).toHaveLength(1);
      expect(securityFAQs).toHaveLength(1);
      
      expect(billingFAQs.every(faq => faq.category === 'Premium & Billing')).toBe(true);
      expect(featureFAQs.every(faq => faq.category === 'Features')).toBe(true);
      expect(securityFAQs.every(faq => faq.category === 'Security')).toBe(true);
    });

    it('should search FAQs by question content', () => {
      const refundFAQs = helpSupportService.searchFAQs('refund');
      
      expect(refundFAQs).toHaveLength(2); // premium-guarantee and refund-policy
      expect(refundFAQs.some(faq => faq.id === 'premium-guarantee')).toBe(true);
      expect(refundFAQs.some(faq => faq.id === 'refund-policy')).toBe(true);
    });

    it('should search FAQs by answer content', () => {
      const limitFAQs = helpSupportService.searchFAQs('15 appointments');
      
      expect(limitFAQs).toHaveLength(1);
      expect(limitFAQs[0].id).toBe('appointment-limits');
    });

    it('should return empty array for non-existent search term', () => {
      const noResults = helpSupportService.searchFAQs('nonexistent term');
      
      expect(noResults).toHaveLength(0);
    });
  });

  describe('Support Ticket Creation', () => {
    it('should create support ticket with correct data', () => {
      const ticketData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Billing question',
        message: 'I have a question about my premium subscription billing.'
      };

      const ticket = helpSupportService.createSupportTicket(ticketData);

      expect(ticket.id).toMatch(/^TICKET_\d+$/);
      expect(ticket.name).toBe(ticketData.name);
      expect(ticket.email).toBe(ticketData.email);
      expect(ticket.subject).toBe(ticketData.subject);
      expect(ticket.message).toBe(ticketData.message);
      expect(ticket.status).toBe('open');
      expect(ticket.createdAt).toBeInstanceOf(Date);
      expect(ticket.updatedAt).toBeInstanceOf(Date);
    });

    it('should assign correct priority based on content', () => {
      const urgentTicket = helpSupportService.createSupportTicket({
        name: 'User',
        email: 'user@example.com',
        subject: 'URGENT: Cannot access account',
        message: 'This is an emergency situation.'
      });

      const billingTicket = helpSupportService.createSupportTicket({
        name: 'User',
        email: 'user@example.com',
        subject: 'Refund request',
        message: 'I need a refund for my subscription.'
      });

      const generalTicket = helpSupportService.createSupportTicket({
        name: 'User',
        email: 'user@example.com',
        subject: 'General question',
        message: 'How do I update my profile?'
      });

      expect(urgentTicket.priority).toBe('high');
      expect(billingTicket.priority).toBe('medium');
      expect(generalTicket.priority).toBe('low');
    });
  });

  describe('Form Validation', () => {
    it('should validate valid form data', () => {
      const validForm = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Valid subject line',
        message: 'This is a valid message with enough content.'
      };

      const validation = helpSupportService.validateSupportForm(validForm);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject form with short name', () => {
      const invalidForm = {
        name: 'J',
        email: 'john@example.com',
        subject: 'Valid subject',
        message: 'Valid message content here.'
      };

      const validation = helpSupportService.validateSupportForm(invalidForm);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Name must be at least 2 characters long');
    });

    it('should reject form with invalid email', () => {
      const invalidForm = {
        name: 'John Doe',
        email: 'invalid-email',
        subject: 'Valid subject',
        message: 'Valid message content here.'
      };

      const validation = helpSupportService.validateSupportForm(invalidForm);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Please provide a valid email address');
    });

    it('should reject form with short subject', () => {
      const invalidForm = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Hi',
        message: 'Valid message content here.'
      };

      const validation = helpSupportService.validateSupportForm(invalidForm);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Subject must be at least 5 characters long');
    });

    it('should reject form with short message', () => {
      const invalidForm = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Valid subject',
        message: 'Short'
      };

      const validation = helpSupportService.validateSupportForm(invalidForm);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Message must be at least 10 characters long');
    });

    it('should collect multiple validation errors', () => {
      const invalidForm = {
        name: '',
        email: 'invalid',
        subject: 'Hi',
        message: 'Short'
      };

      const validation = helpSupportService.validateSupportForm(invalidForm);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(4);
    });
  });

  describe('Email Template Generation', () => {
    it('should generate auto-reply email correctly', () => {
      const variables = {
        name: 'John Doe',
        subject: 'Billing question',
        ticketId: 'TICKET_123456'
      };

      const email = helpSupportService.generateEmailFromTemplate('support-auto-reply', variables);

      expect(email.subject).toBe('We received your support request - Ticket #TICKET_123456');
      expect(email.body).toContain('Hi John Doe,');
      expect(email.body).toContain('about "Billing question"');
      expect(email.body).toContain('Ticket ID: #TICKET_123456');
    });

    it('should generate resolution email correctly', () => {
      const variables = {
        name: 'Jane Smith',
        subject: 'Account access issue',
        ticketId: 'TICKET_789012'
      };

      const email = helpSupportService.generateEmailFromTemplate('support-resolution', variables);

      expect(email.subject).toBe('Your support ticket has been resolved - #TICKET_789012');
      expect(email.body).toContain('Hi Jane Smith,');
      expect(email.body).toContain('ticket #TICKET_789012 regarding "Account access issue"');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        helpSupportService.generateEmailFromTemplate('non-existent', {});
      }).toThrow('Template non-existent not found');
    });
  });

  describe('Ticket Management', () => {
    it('should retrieve ticket by ID', () => {
      const ticketData = {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test subject',
        message: 'Test message'
      };

      const ticket = helpSupportService.createSupportTicket(ticketData);
      const retrieved = helpSupportService.getTicketById(ticket.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(ticket.id);
      expect(retrieved!.name).toBe(ticketData.name);
    });

    it('should return null for non-existent ticket ID', () => {
      const retrieved = helpSupportService.getTicketById('NON_EXISTENT_ID');
      
      expect(retrieved).toBeNull();
    });

    it('should update ticket status correctly', async () => {
      const ticket = helpSupportService.createSupportTicket({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test subject',
        message: 'Test message'
      });

      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      const updated = helpSupportService.updateTicketStatus(ticket.id, 'in_progress');
      const retrieved = helpSupportService.getTicketById(ticket.id);

      expect(updated).toBe(true);
      expect(retrieved!.status).toBe('in_progress');
      expect(retrieved!.updatedAt.getTime()).toBeGreaterThanOrEqual(retrieved!.createdAt.getTime());
    });

    it('should return false when updating non-existent ticket', () => {
      const updated = helpSupportService.updateTicketStatus('NON_EXISTENT_ID', 'resolved');
      
      expect(updated).toBe(false);
    });

    it('should filter tickets by status', () => {
      // Create tickets with different statuses
      const ticket1 = helpSupportService.createSupportTicket({
        name: 'User 1',
        email: 'user1@example.com',
        subject: 'Issue 1',
        message: 'Message 1'
      });

      const ticket2 = helpSupportService.createSupportTicket({
        name: 'User 2',
        email: 'user2@example.com',
        subject: 'Issue 2',
        message: 'Message 2'
      });

      // Update one ticket status
      helpSupportService.updateTicketStatus(ticket1.id, 'resolved');

      const openTickets = helpSupportService.getTicketsByStatus('open');
      const resolvedTickets = helpSupportService.getTicketsByStatus('resolved');

      expect(openTickets).toHaveLength(1);
      expect(openTickets[0].id).toBe(ticket2.id);
      expect(resolvedTickets).toHaveLength(1);
      expect(resolvedTickets[0].id).toBe(ticket1.id);
    });
  });

  describe('Mailto Link Generation', () => {
    it('should generate correct mailto link', () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Help with subscription',
        message: 'I need help with my premium subscription.'
      };

      const mailtoLink = helpSupportService.generateMailtoLink(formData);

      expect(mailtoLink).toContain('mailto:customersupport@kall-e.com');
      expect(mailtoLink).toContain('subject=Help%20with%20subscription');
      expect(mailtoLink).toContain('Name%3A%20John%20Doe');
      expect(mailtoLink).toContain('Email%3A%20john%40example.com');
      expect(mailtoLink).toContain('I%20need%20help%20with%20my%20premium%20subscription.');
    });

    it('should handle special characters in mailto link', () => {
      const formData = {
        name: 'José García',
        email: 'jose@example.com',
        subject: 'Refund & Billing Question?',
        message: 'Can you help me with billing? I have questions about refunds & charges.'
      };

      const mailtoLink = helpSupportService.generateMailtoLink(formData);

      expect(mailtoLink).toContain('mailto:customersupport@kall-e.com');
      expect(mailtoLink).toContain('Refund%20%26%20Billing%20Question%3F');
      expect(mailtoLink).toContain('Jos%C3%A9%20Garc%C3%ADa');
    });
  });
});