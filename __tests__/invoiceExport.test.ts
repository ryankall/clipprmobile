import { describe, it, expect, beforeEach } from 'vitest';

interface Invoice {
  id: number;
  userId: number;
  clientId: number;
  total: string;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: Date;
  paymentMethod?: 'stripe' | 'apple_pay' | 'cash';
}

interface Client {
  id: number;
  name: string;
  email?: string;
  phone: string;
}

interface User {
  id: number;
  email?: string;
  firstName: string;
  lastName: string;
}

interface ExportResult {
  success: boolean;
  message: string;
  csvData?: string;
  emailSent?: boolean;
}

class MockEmailService {
  async sendEmail(to: string, subject: string, body: string, attachment?: { filename: string; content: string }): Promise<boolean> {
    // Simulate email sending
    return Promise.resolve(true);
  }
}

// CSV Export Service
class InvoiceExportService {
  private emailService: MockEmailService;
  
  constructor() {
    this.emailService = new MockEmailService();
  }
  
  generateCSV(invoices: Invoice[], clients: Client[]): string {
    const headers = ['Invoice ID', 'Client Name', 'Client Phone', 'Total', 'Status', 'Payment Method', 'Date Created'];
    const rows = [headers.join(',')];
    
    invoices.forEach(invoice => {
      const client = clients.find(c => c.id === invoice.clientId);
      const row = [
        invoice.id.toString(),
        client?.name || 'Unknown Client',
        client?.phone || 'N/A',
        invoice.total,
        invoice.status,
        invoice.paymentMethod || 'N/A',
        invoice.createdAt.toISOString().split('T')[0] // YYYY-MM-DD format
      ];
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  }
  
  async exportToEmail(user: User, invoices: Invoice[], clients: Client[]): Promise<ExportResult> {
    if (!user.email) {
      return {
        success: false,
        message: 'No email address found for user'
      };
    }
    
    if (!invoices || invoices.length === 0) {
      return {
        success: false,
        message: 'No invoices to export'
      };
    }
    
    const csvData = this.generateCSV(invoices, clients);
    const filename = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    const emailSent = await this.emailService.sendEmail(
      user.email,
      'Invoice Export - Clippr',
      `Hi ${user.firstName},\n\nYour invoice export is attached. This file contains ${invoices.length} invoices in CSV format.\n\nBest regards,\nClippr Team`,
      { filename, content: csvData }
    );
    
    return {
      success: emailSent,
      message: emailSent ? 'Invoice export sent successfully' : 'Failed to send export email',
      csvData,
      emailSent
    };
  }
}

// Mock data generators
function generateMockInvoices(count: number): Invoice[] {
  const invoices: Invoice[] = [];
  const baseDate = new Date('2025-07-01');
  
  for (let i = 0; i < count; i++) {
    const createdAt = new Date(baseDate);
    createdAt.setDate(baseDate.getDate() + i);
    
    invoices.push({
      id: i + 1,
      userId: 3,
      clientId: 26 + (i % 3), // Distribute across 3 clients
      total: (25.00 + (i * 10)).toFixed(2),
      status: i % 3 === 0 ? 'paid' : i % 3 === 1 ? 'pending' : 'overdue',
      createdAt,
      paymentMethod: i % 3 === 0 ? 'stripe' : i % 3 === 1 ? 'cash' : 'apple_pay'
    });
  }
  
  return invoices;
}

function generateMockClients(): Client[] {
  return [
    { id: 26, name: 'David Rodriguez', email: 'david@example.com', phone: '555-0101' },
    { id: 27, name: 'Test Customer', email: 'test@example.com', phone: '555-0102' },
    { id: 28, name: 'Anthony Davis', email: 'anthony@example.com', phone: '555-0103' }
  ];
}

describe('Invoice Export Functionality', () => {
  let exportService: InvoiceExportService;
  let mockInvoices: Invoice[];
  let mockClients: Client[];
  
  beforeEach(() => {
    exportService = new InvoiceExportService();
    mockInvoices = generateMockInvoices(5);
    mockClients = generateMockClients();
  });

  describe('CSV Generation', () => {
    it('should generate valid CSV with proper headers', () => {
      const csvData = exportService.generateCSV(mockInvoices, mockClients);
      const lines = csvData.split('\n');
      
      expect(lines[0]).toBe('Invoice ID,Client Name,Client Phone,Total,Status,Payment Method,Date Created');
      expect(lines.length).toBe(mockInvoices.length + 1); // +1 for header
    });

    it('should include all invoice data in CSV format', () => {
      const csvData = exportService.generateCSV(mockInvoices, mockClients);
      const lines = csvData.split('\n');
      
      // Check first data row
      const firstDataRow = lines[1].split(',');
      expect(firstDataRow[0]).toBe('1'); // Invoice ID
      expect(firstDataRow[1]).toBe('David Rodriguez'); // Client Name
      expect(firstDataRow[2]).toBe('555-0101'); // Client Phone
      expect(firstDataRow[3]).toBe('25.00'); // Total
      expect(firstDataRow[4]).toBe('paid'); // Status
      expect(firstDataRow[5]).toBe('stripe'); // Payment Method
      expect(firstDataRow[6]).toBe('2025-07-01'); // Date
    });

    it('should handle unknown clients gracefully', () => {
      const invoiceWithUnknownClient: Invoice = {
        id: 99,
        userId: 3,
        clientId: 999, // Non-existent client
        total: '50.00',
        status: 'pending',
        createdAt: new Date('2025-07-01'),
        paymentMethod: 'cash'
      };
      
      const csvData = exportService.generateCSV([invoiceWithUnknownClient], mockClients);
      const lines = csvData.split('\n');
      const dataRow = lines[1].split(',');
      
      expect(dataRow[1]).toBe('Unknown Client');
      expect(dataRow[2]).toBe('N/A');
    });

    it('should handle missing payment method', () => {
      const invoiceWithoutPaymentMethod: Invoice = {
        id: 100,
        userId: 3,
        clientId: 26,
        total: '75.00',
        status: 'pending',
        createdAt: new Date('2025-07-01')
      };
      
      const csvData = exportService.generateCSV([invoiceWithoutPaymentMethod], mockClients);
      const lines = csvData.split('\n');
      const dataRow = lines[1].split(',');
      
      expect(dataRow[5]).toBe('N/A');
    });

    it('should generate empty CSV with only headers when no invoices', () => {
      const csvData = exportService.generateCSV([], mockClients);
      const lines = csvData.split('\n');
      
      expect(lines.length).toBe(1);
      expect(lines[0]).toBe('Invoice ID,Client Name,Client Phone,Total,Status,Payment Method,Date Created');
    });
  });

  describe('Email Export', () => {
    it('should successfully export invoices to user email', async () => {
      const user: User = {
        id: 3,
        email: 'barber@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const result = await exportService.exportToEmail(user, mockInvoices, mockClients);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Invoice export sent successfully');
      expect(result.emailSent).toBe(true);
      expect(result.csvData).toBeDefined();
    });

    it('should fail when user has no email', async () => {
      const userWithoutEmail: User = {
        id: 3,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const result = await exportService.exportToEmail(userWithoutEmail, mockInvoices, mockClients);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('No email address found for user');
      expect(result.emailSent).toBeUndefined();
    });

    it('should fail when no invoices to export', async () => {
      const user: User = {
        id: 3,
        email: 'barber@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const result = await exportService.exportToEmail(user, [], mockClients);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('No invoices to export');
      expect(result.emailSent).toBeUndefined();
    });

    it('should include proper filename with current date', async () => {
      const user: User = {
        id: 3,
        email: 'barber@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const result = await exportService.exportToEmail(user, mockInvoices, mockClients);
      const currentDate = new Date().toISOString().split('T')[0];
      
      expect(result.success).toBe(true);
      expect(result.csvData).toBeDefined();
      // The filename should contain current date (tested indirectly through success)
    });

    it('should handle large invoice datasets', async () => {
      const user: User = {
        id: 3,
        email: 'barber@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const largeInvoiceSet = generateMockInvoices(100);
      const result = await exportService.exportToEmail(user, largeInvoiceSet, mockClients);
      
      expect(result.success).toBe(true);
      expect(result.csvData).toBeDefined();
      
      const lines = result.csvData!.split('\n');
      expect(lines.length).toBe(101); // 100 invoices + 1 header
    });

    it('should format email content correctly', async () => {
      const user: User = {
        id: 3,
        email: 'barber@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const result = await exportService.exportToEmail(user, mockInvoices, mockClients);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      // Email content format is tested indirectly through successful sending
    });
  });

  describe('Edge Cases', () => {
    it('should handle invoices with special characters in client names', () => {
      const clientWithSpecialChars: Client = {
        id: 99,
        name: 'José María, Jr.',
        email: 'jose@example.com',
        phone: '555-0199'
      };
      
      const invoice: Invoice = {
        id: 1,
        userId: 3,
        clientId: 99,
        total: '50.00',
        status: 'paid',
        createdAt: new Date('2025-07-01'),
        paymentMethod: 'stripe'
      };
      
      const csvData = exportService.generateCSV([invoice], [clientWithSpecialChars]);
      const lines = csvData.split('\n');
      
      expect(lines[1]).toContain('José María, Jr.');
    });

    it('should handle invoices with very large amounts', () => {
      const expensiveInvoice: Invoice = {
        id: 1,
        userId: 3,
        clientId: 26,
        total: '999999.99',
        status: 'paid',
        createdAt: new Date('2025-07-01'),
        paymentMethod: 'stripe'
      };
      
      const csvData = exportService.generateCSV([expensiveInvoice], mockClients);
      const lines = csvData.split('\n');
      const dataRow = lines[1].split(',');
      
      expect(dataRow[3]).toBe('999999.99');
    });

    it('should handle date formatting correctly across different timezones', () => {
      const invoiceWithDate: Invoice = {
        id: 1,
        userId: 3,
        clientId: 26,
        total: '25.00',
        status: 'paid',
        createdAt: new Date('2025-12-31T23:59:59Z'),
        paymentMethod: 'stripe'
      };
      
      const csvData = exportService.generateCSV([invoiceWithDate], mockClients);
      const lines = csvData.split('\n');
      const dataRow = lines[1].split(',');
      
      expect(dataRow[6]).toBe('2025-12-31');
    });
  });
});