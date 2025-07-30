import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Invoice from '../app/(tabs)/invoice';
import { Alert } from 'react-native';

// Mock hooks and dependencies
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock('../lib/api', () => ({
  apiRequest: vi.fn().mockResolvedValue([]),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  getItem: vi.fn().mockResolvedValue('[]'),
  setItem: vi.fn(),
}));

// Silence Alert.alert
vi.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('Invoice Tab UI interactions', () => {
  it('opens and closes the Service Modal via Add Service button', async () => {
    const { getByText, queryByText, getByLabelText } = render(<Invoice />);
    // Open Service Modal
    await waitFor(() => expect(getByText('Add Service')).toBeTruthy());
    fireEvent.press(getByText('Add Service'));
    expect(getByText(/Add Service|Edit Service/i)).toBeTruthy();
    // Close Service Modal
    fireEvent.press(getByLabelText('Close'));
    await waitFor(() => expect(queryByText(/Add Service|Edit Service/i)).toBeNull());
  });

  it('opens and closes the Create Invoice Modal via Create button', async () => {
    const { getByText, queryByText, getAllByText, getByLabelText } = render(<Invoice />);
    // Open Create Invoice Modal
    await waitFor(() => expect(getByText('Create')).toBeTruthy());
    fireEvent.press(getByText('Create'));
    expect(getByText('Create Invoice')).toBeTruthy();
    // Close Create Invoice Modal
    fireEvent.press(getByLabelText('Close'));
    await waitFor(() => expect(queryByText('Create Invoice')).toBeNull());
  });

  it('opens and closes the Create Invoice Modal via quick template', async () => {
    const { getByText, queryByText, getByLabelText } = render(<Invoice />);
    // Open via "Haircut" quick template
    await waitFor(() => expect(getByText('Haircut')).toBeTruthy());
    fireEvent.press(getByText('Haircut'));
    expect(getByText('Create Invoice')).toBeTruthy();
    // Close
    fireEvent.press(getByLabelText('Close'));
    await waitFor(() => expect(queryByText('Create Invoice')).toBeNull());
  });

  it('opens and closes the Template Modal via New button', async () => {
    const { getByText, queryByText, getByLabelText } = render(<Invoice />);
    // Open Template Modal
    await waitFor(() => expect(getByText('New')).toBeTruthy());
    fireEvent.press(getByText('New'));
    expect(getByText('Create Template')).toBeTruthy();
    // Close Template Modal
    fireEvent.press(getByLabelText('Close'));
    await waitFor(() => expect(queryByText('Create Template')).toBeNull());
  });

  it('opens and closes the Invoice Details Modal via invoice list', async () => {
    // Mock invoices and clients
    const invoice = {
      id: 1,
      clientId: 1,
      subtotal: '50',
      tip: '5',
      total: '55',
      status: 'pending',
      paymentMethod: 'cash',
      createdAt: new Date().toISOString(),
    };
    const client = { id: 1, name: 'Test Client', phone: '123' };
    (require('../lib/api').apiRequest as any)
      .mockImplementation((method: string, url: string) => {
        if (url === '/api/invoices') return Promise.resolve([invoice]);
        if (url === '/api/clients') return Promise.resolve([client]);
        return Promise.resolve([]);
      });

    const { getByText, queryByText, getByLabelText } = render(<Invoice />);
    // Wait for invoice to appear
    await waitFor(() => expect(getByText('Test Client')).toBeTruthy());
    fireEvent.press(getByText('Test Client'));
    expect(getByText('Invoice Details')).toBeTruthy();
    // Close Invoice Details Modal
    fireEvent.press(getByLabelText('Close'));
    await waitFor(() => expect(queryByText('Invoice Details')).toBeNull());
  });

  it('disables Export button when no invoices, enables when invoices exist', async () => {
    // No invoices
    const { getByText, rerender } = render(<Invoice />);
    await waitFor(() => expect(getByText('No Invoices to Export')).toBeTruthy());
    // With invoices
    const invoice = {
      id: 1,
      clientId: 1,
      subtotal: '50',
      tip: '5',
      total: '55',
      status: 'pending',
      paymentMethod: 'cash',
      createdAt: new Date().toISOString(),
    };
    const client = { id: 1, name: 'Test Client', phone: '123' };
    (require('../lib/api').apiRequest as any)
      .mockImplementation((method: string, url: string) => {
        if (url === '/api/invoices') return Promise.resolve([invoice]);
        if (url === '/api/clients') return Promise.resolve([client]);
        return Promise.resolve([]);
      });
    rerender(<Invoice />);
    await waitFor(() => expect(getByText('Email CSV')).toBeTruthy());
  });

  it('opens Service Modal in edit mode when service card is pressed', async () => {
    // Mock services
    const service = {
      id: 1,
      name: 'Test Service',
      description: 'desc',
      price: '10',
      duration: 30,
      category: 'Haircuts',
      isActive: true,
    };
    (require('../lib/api').apiRequest as any)
      .mockImplementation((method: string, url: string) => {
        if (url === '/api/services') return Promise.resolve([service]);
        return Promise.resolve([]);
      });
    const { getByText } = render(<Invoice />);
    await waitFor(() => expect(getByText('Test Service')).toBeTruthy());
    fireEvent.press(getByText('Test Service'));
    expect(getByText('Edit Service')).toBeTruthy();
  });

  it('shows and closes all modals independently', async () => {
    const { getByText, queryByText, getAllByLabelText } = render(<Invoice />);
    // Open Service Modal
    fireEvent.press(getByText('Add Service'));
    expect(getByText(/Add Service|Edit Service/i)).toBeTruthy();
    // Open Create Invoice Modal
    fireEvent.press(getByText('Create'));
    expect(getByText('Create Invoice')).toBeTruthy();
    // Open Template Modal
    fireEvent.press(getByText('New'));
    expect(getByText('Create Template')).toBeTruthy();
    // Close all modals
    getAllByLabelText('Close').forEach((btn: any) => fireEvent.press(btn));
    await waitFor(() => {
      expect(queryByText(/Add Service|Edit Service/i)).toBeNull();
      expect(queryByText('Create Invoice')).toBeNull();
      expect(queryByText('Create Template')).toBeNull();
    });
  });
});
describe('Dashboard "Invoice" button', () => {
  it('navigates to invoice tab and pre-fills client and services', async () => {
    // Mock router and navigation
    const mockPush = vi.fn();
    vi.mock('expo-router', () => {
      const actual = vi.importActual('expo-router');
      return {
        ...actual,
        router: { push: mockPush },
        useLocalSearchParams: () => ({
          prefillClientId: '1',
          prefillServices: JSON.stringify([2, 3]),
        }),
      };
    });

    // Mock current appointment with client and services
    const currentAppointment = {
      id: 10,
      client: { id: 1, name: 'Alice', phone: '555-1234' },
      appointmentServices: [
        { service: { id: 2, name: 'Cut' } },
        { service: { id: 3, name: 'Shave' } },
      ],
      scheduledAt: new Date().toISOString(),
      duration: 30,
      price: 50,
      status: 'confirmed',
    };

    // Mock todayAppointments to include currentAppointment
    (require('../lib/api').apiRequest as any)
      .mockImplementation((method: string, url: string) => {
        if (url === '/api/dashboard') return Promise.resolve({});
        if (url === '/api/appointments/today') return Promise.resolve([currentAppointment]);
        if (url === '/api/messages/unread-count') return Promise.resolve({ count: 0 });
        if (url === '/api/user/profile') return Promise.resolve({ id: 1, firstName: 'Barber' });
        if (url === '/api/appointments/pending') return Promise.resolve([]);
        if (url === '/api/gallery') return Promise.resolve([]);
        if (url === '/api/clients') return Promise.resolve([currentAppointment.client]);
        if (url === '/api/services') return Promise.resolve([
          { id: 2, name: 'Cut', price: '30', duration: 20, category: 'Haircuts', isActive: true },
          { id: 3, name: 'Shave', price: '20', duration: 10, category: 'Beard', isActive: true },
        ]);
        return Promise.resolve([]);
      });

    // Dynamically import Dashboard and Invoice after mocks
    const Dashboard = require('../app/(tabs)/index').default;
    const Invoice = require('../app/(tabs)/invoice').default;

    // Render Dashboard and click "Invoice"
    const { getByText, findByText } = render(<Dashboard />);
    await waitFor(() => expect(getByText('Invoice')).toBeTruthy());
    fireEvent.press(getByText('Invoice'));

    // Simulate navigation to Invoice tab with params
    const { getByText: getByTextInvoice } = render(<Invoice />);
    // Modal should open with client and services pre-filled
    await waitFor(() => expect(getByTextInvoice('Create Invoice')).toBeTruthy());
    expect(getByTextInvoice('Alice')).toBeTruthy();
    expect(getByTextInvoice('Cut')).toBeTruthy();
    expect(getByTextInvoice('Shave')).toBeTruthy();
  });
});