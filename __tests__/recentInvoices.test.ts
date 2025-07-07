import { describe, it, expect } from 'vitest';

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

// Mock invoice data generator
function generateMockInvoices(count: number): Invoice[] {
  const invoices: Invoice[] = [];
  const baseDate = new Date('2025-07-01');
  
  for (let i = 0; i < count; i++) {
    const createdAt = new Date(baseDate);
    createdAt.setDate(baseDate.getDate() + i);
    
    invoices.push({
      id: i + 1,
      userId: 3,
      clientId: 26 + (i % 5), // Distribute across 5 clients
      total: (25.00 + (i * 5)).toFixed(2),
      status: i % 3 === 0 ? 'paid' : i % 3 === 1 ? 'pending' : 'overdue',
      createdAt,
      paymentMethod: i % 3 === 0 ? 'stripe' : i % 3 === 1 ? 'cash' : 'apple_pay'
    });
  }
  
  return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function getRecentInvoices(invoices: Invoice[], limit: number = 10): Invoice[] {
  return invoices.slice(0, limit);
}

describe('Recent Invoices Display Logic', () => {
  it('should show only last 10 invoices when more than 10 exist', () => {
    const invoices = generateMockInvoices(25);
    const recentInvoices = getRecentInvoices(invoices, 10);
    
    expect(recentInvoices).toHaveLength(10);
    expect(recentInvoices[0].id).toBe(25); // Most recent
    expect(recentInvoices[9].id).toBe(16); // 10th most recent
  });

  it('should show all invoices when less than 10 exist', () => {
    const invoices = generateMockInvoices(7);
    const recentInvoices = getRecentInvoices(invoices, 10);
    
    expect(recentInvoices).toHaveLength(7);
    expect(recentInvoices[0].id).toBe(7); // Most recent
    expect(recentInvoices[6].id).toBe(1); // Oldest
  });

  it('should show exactly 10 invoices when exactly 10 exist', () => {
    const invoices = generateMockInvoices(10);
    const recentInvoices = getRecentInvoices(invoices, 10);
    
    expect(recentInvoices).toHaveLength(10);
    expect(recentInvoices[0].id).toBe(10); // Most recent
    expect(recentInvoices[9].id).toBe(1); // Oldest
  });

  it('should return empty array when no invoices exist', () => {
    const invoices: Invoice[] = [];
    const recentInvoices = getRecentInvoices(invoices, 10);
    
    expect(recentInvoices).toHaveLength(0);
  });

  it('should maintain chronological order (newest first)', () => {
    const invoices = generateMockInvoices(15);
    const recentInvoices = getRecentInvoices(invoices, 10);
    
    // Check that dates are in descending order
    for (let i = 0; i < recentInvoices.length - 1; i++) {
      expect(recentInvoices[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        recentInvoices[i + 1].createdAt.getTime()
      );
    }
  });

  it('should respect custom limit parameter', () => {
    const invoices = generateMockInvoices(20);
    const recentInvoices = getRecentInvoices(invoices, 5);
    
    expect(recentInvoices).toHaveLength(5);
    expect(recentInvoices[0].id).toBe(20); // Most recent
    expect(recentInvoices[4].id).toBe(16); // 5th most recent
  });

  it('should include all invoice properties for recent invoices', () => {
    const invoices = generateMockInvoices(5);
    const recentInvoices = getRecentInvoices(invoices, 10);
    
    expect(recentInvoices[0]).toHaveProperty('id');
    expect(recentInvoices[0]).toHaveProperty('userId');
    expect(recentInvoices[0]).toHaveProperty('clientId');
    expect(recentInvoices[0]).toHaveProperty('total');
    expect(recentInvoices[0]).toHaveProperty('status');
    expect(recentInvoices[0]).toHaveProperty('createdAt');
    expect(recentInvoices[0]).toHaveProperty('paymentMethod');
  });
});