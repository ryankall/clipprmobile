import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ClientProfile from '../app/clients/[id]';
import InvoiceScreen from '../app/(tabs)/invoice';
import * as api from '../lib/api';

vi.mock('../lib/api');

const mockInvoices = [
  { id: 1, clientId: 123, subtotal: '50', tip: '5', total: '55', paymentStatus: 'unpaid', paymentMethod: 'cash', createdAt: '2025-07-29T12:00:00Z' },
  { id: 2, clientId: 123, subtotal: '30', tip: '0', total: '30', paymentStatus: 'paid', paymentMethod: 'stripe', createdAt: '2025-07-28T12:00:00Z' },
];

const mockClient = {
  id: 123,
  name: 'Test Client',
  phone: '555-1234',
  email: 'test@example.com',
  totalSpent: '85',
  totalVisits: 2,
  lastVisit: '2025-07-28T12:00:00Z',
  loyaltyStatus: 'regular',
};

describe('Invoice Deletion via Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.apiRequest as any).mockImplementation((method: string, url: string) => {
      if (method === 'GET' && url.startsWith('/api/clients/123')) {
        if (url.endsWith('/invoices')) return Promise.resolve([...mockInvoices]);
        if (url.endsWith('/messages?limit=20')) return Promise.resolve([]);
        if (url.endsWith('/appointments?limit=10')) return Promise.resolve([]);
        if (url.endsWith('/gallery')) return Promise.resolve([]);
        return Promise.resolve(mockClient);
      }
      if (method === 'GET' && url.startsWith('/api/invoices/')) {
        const id = parseInt(url.split('/').pop() || '', 10);
        return Promise.resolve(mockInvoices.find(inv => inv.id === id));
      }
      if (method === 'GET' && url === '/api/invoices') {
        return Promise.resolve([...mockInvoices]);
      }
      if (method === 'GET' && url === '/api/clients') {
        return Promise.resolve([mockClient]);
      }
      if (method === 'DELETE' && url.startsWith('/api/invoices/')) {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });
  });

  it('deletes invoice from client profile and removes it from the list', async () => {
    const { getByText, queryByText, getAllByText, findByText } = render(<ClientProfile />);
    // Wait for invoices to load
    await findByText('Invoice History (2)');
    // Open first invoice modal
    fireEvent.press(getByText(/Invoice #1/));
    // Wait for modal to appear
    await findByText('Invoice Details');
    // Press trash can button
    fireEvent.press(getByText('Delete Invoice'));
    // Confirm deletion in Alert
    await waitFor(() => expect(api.apiRequest).toHaveBeenCalledWith('DELETE', '/api/invoices/1'));
    // Modal should close and invoice should be removed
    await waitFor(() => expect(queryByText(/Invoice #1/)).toBeNull());
    // Only one invoice should remain
    expect(getByText(/Invoice #2/)).toBeTruthy();
  });

  it('deletes invoice from invoice history and removes it from the list', async () => {
    const { getByText, queryByText, findByText } = render(<InvoiceScreen />);
    // Wait for invoices to load
    await findByText('Recent Invoices');
    // Open first invoice modal
    fireEvent.press(getByText(/Test Client/));
    // Wait for modal to appear
    await findByText('Invoice Details');
    // Press trash can button
    fireEvent.press(getByText('Delete Invoice'));
    // Confirm deletion in Alert
    await waitFor(() => expect(api.apiRequest).toHaveBeenCalledWith('DELETE', '/api/invoices/1'));
    // Modal should close and invoice should be removed
    await waitFor(() => expect(queryByText(/Test Client/)).toBeNull());
    // Only one invoice should remain
    expect(getByText(/Test Client/)).toBeTruthy();
  });
});