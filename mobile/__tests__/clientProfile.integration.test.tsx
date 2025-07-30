// mobile/__tests__/clientProfile.integration.test.tsx

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ClientProfile from '../app/clients/[id]';
import * as api from '../lib/api';
import { Alert, Linking } from 'react-native';

// --- Mocks ---

// Mock navigation
const pushMock = vi.fn();
const replaceMock = vi.fn();
const backMock = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    back: backMock,
  }),
  useLocalSearchParams: () => ({ id: '1' }),
}));

// Mock Alert and Linking
vi.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
  // Simulate pressing the destructive/confirm button if present
  if (buttons && Array.isArray(buttons)) {
    const destructive = buttons.find(
      b => b.style === 'destructive' || b.text?.toLowerCase().includes('delete') || b.text?.toLowerCase().includes('confirm')
    );
    if (destructive && destructive.onPress) destructive.onPress();
  }
});
vi.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

// --- Mock Data ---

const mockClient = {
  id: 1,
  userId: 1,
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john@example.com',
  address: '123 Main St',
  preferredStyle: 'Fade',
  notes: 'VIP client',
  loyaltyStatus: 'vip',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  totalSpent: '500',
  totalVisits: 12,
  lastVisit: new Date().toISOString(),
};

const mockAppointments = [
  {
    id: 1,
    userId: 1,
    clientId: 1,
    scheduledAt: new Date().toISOString(),
    duration: 60,
    status: 'confirmed',
    travelRequired: false,
    address: '123 Main St',
    price: '100',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    client: mockClient,
    service: { id: 1, userId: 1, name: 'Haircut', price: '100', duration: 60, category: 'Hair', isActive: true, createdAt: '', updatedAt: '' },
    services: [],
  },
];
const mockMessages = [
  {
    id: 1,
    barberId: '1',
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    selectedDate: '2024-01-01',
    selectedTime: '10:00',
    services: ['Haircut'],
    message: 'Looking forward to my appointment!',
    isTravel: false,
    address: '123 Main St',
    createdAt: new Date().toISOString(),
  },
];
const mockInvoices = [
  {
    id: 1,
    clientId: 1,
    amount: '100.00',
    status: 'paid',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    services: ['Haircut'],
  },
];
const mockPhotos = [
  {
    id: 1,
    userId: 1,
    clientId: 1,
    appointmentId: 1,
    filename: 'https://example.com/photo.jpg',
    originalName: 'After Cut',
    mimeType: 'image/jpeg',
    size: 12345,
    type: 'after',
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
];

// --- API Mock ---

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(api, 'apiRequest').mockImplementation((method, endpoint, body) => {
    // Simulate loading, error, and empty states by endpoint
    if (endpoint === '/api/clients/1' && method === 'GET') return Promise.resolve({ ...mockClient });
    if (endpoint === '/api/clients/1' && method === 'PUT') {
      if (body && !body.name) {
        // Simulate validation error
        return Promise.reject({ message: 'Name is required', status: 400 });
      }
      return Promise.resolve({ ...mockClient, ...body });
    }
    if (endpoint === '/api/clients/1' && method === 'DELETE') return Promise.resolve({});
    if (endpoint.startsWith('/api/clients/1/appointments')) return Promise.resolve(mockAppointments);
    if (endpoint.startsWith('/api/clients/1/messages')) return Promise.resolve(mockMessages);
    if (endpoint.startsWith('/api/clients/1/invoices')) return Promise.resolve(mockInvoices);
    if (endpoint.startsWith('/api/clients/1/gallery')) return Promise.resolve(mockPhotos);
    // Simulate empty state
    if (endpoint.startsWith('/api/clients/2')) return Promise.resolve({});
    // Simulate error
    if (endpoint === '/api/clients/err') return Promise.reject({ message: 'Not found', status: 404 });
    return Promise.resolve([]);
  });
});

// --- Tests ---

describe('ClientProfile Integration', () => {
  it('renders loading indicator, then client info and stats', async () => {
    const { getByTestId, findByText } = render(<ClientProfile />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
    expect(await findByText('John Doe')).toBeTruthy();
    expect(await findByText('VIP')).toBeTruthy();
    expect(await findByText('Visits')).toBeTruthy();
    expect(await findByText('Spent')).toBeTruthy();
    expect(await findByText('Upcoming')).toBeTruthy();
    expect(await findByText('123 Main St')).toBeTruthy();
    expect(await findByText('Fade')).toBeTruthy();
    expect(await findByText('Notes')).toBeTruthy();
    expect(await findByText('VIP client')).toBeTruthy();
  });

  it('handles error state gracefully', async () => {
    // @ts-expect-error vi.Mock type
    (api.apiRequest as any).mockImplementationOnce(() => Promise.reject({ message: 'Not found', status: 404 }));
    const { findByText } = render(<ClientProfile />);
    expect(await findByText(/not found/i)).toBeTruthy();
  });

  it('handles empty state', async () => {
    // @ts-expect-error vi.Mock type
    (api.apiRequest as any).mockImplementationOnce(() => Promise.resolve({}));
    const { findByText } = render(<ClientProfile />);
    expect(await findByText(/no client data/i)).toBeTruthy();
  });

  it('edits and saves client info, including validation error', async () => {
    const { getByLabelText, getByText, findByDisplayValue } = render(<ClientProfile />);
    await findByDisplayValue('John Doe');
    fireEvent.press(getByLabelText('Edit client'));
    const nameInput = getByLabelText('Edit name');
    fireEvent.changeText(nameInput, '');
    fireEvent.press(getByLabelText('Save client'));
    expect(getByText('Name is required')).toBeTruthy();
    fireEvent.changeText(nameInput, 'Jane Doe');
    fireEvent.press(getByLabelText('Save client'));
    await waitFor(() => expect(getByText('Jane Doe')).toBeTruthy());
  });

  it('cancels edit mode and resets fields', async () => {
    const { getByLabelText, getByDisplayValue } = render(<ClientProfile />);
    await waitFor(() => getByDisplayValue('John Doe'));
    fireEvent.press(getByLabelText('Edit client'));
    const nameInput = getByLabelText('Edit name');
    fireEvent.changeText(nameInput, 'Jane Doe');
    fireEvent.press(getByLabelText('Cancel edit'));
    expect(getByDisplayValue('John Doe')).toBeTruthy();
  });

  it('deletes the client with confirmation and navigates away', async () => {
    const { getByLabelText } = render(<ClientProfile />);
    fireEvent.press(getByLabelText('Edit client'));
    fireEvent.press(getByLabelText('Delete client'));
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/clients');
    });
  });

  it('calls the client phone number', async () => {
    const { getByLabelText } = render(<ClientProfile />);
    fireEvent.press(getByLabelText('Call client'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+1234567890');
  });

  it('books an appointment and navigates with correct params', async () => {
    const { getByLabelText } = render(<ClientProfile />);
    fireEvent.press(getByLabelText('Book appointment'));
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/calendar',
      params: { clientId: '1' },
    });
  });

  it('navigates to message details with correct params', async () => {
    const { getByLabelText, findByText } = render(<ClientProfile />);
    await findByText('Message History (1)');
    fireEvent.press(getByLabelText('View message details'));
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/messages',
      params: { messageId: '1' },
    });
  });

  it('opens and closes the invoice modal, and deletes an invoice', async () => {
    const { getByLabelText, findByText, queryByText } = render(<ClientProfile />);
    await findByText('Invoices (1)');
    fireEvent.press(getByLabelText('Open invoice modal'));
    expect(await findByText('Invoice #1')).toBeTruthy();
    fireEvent.press(getByLabelText('Delete invoice'));
    // Alert.alert is mocked to auto-confirm
    await waitFor(() => {
      expect(api.apiRequest).toHaveBeenCalledWith('DELETE', '/api/clients/1/invoices/1', undefined);
    });
    fireEvent.press(getByLabelText('Close invoice modal'));
    expect(queryByText('Invoice #1')).toBeNull();
  });

  it('shows all relevant button presses and UI updates', async () => {
    const { getByLabelText, getByText, findByText } = render(<ClientProfile />);
    await findByText('John Doe');
    fireEvent.press(getByLabelText('Edit client'));
    fireEvent.changeText(getByLabelText('Edit name'), 'Test User');
    fireEvent.press(getByLabelText('Save client'));
    await waitFor(() => expect(getByText('Test User')).toBeTruthy());
    fireEvent.press(getByLabelText('Book appointment'));
    expect(pushMock).toHaveBeenCalled();
    fireEvent.press(getByLabelText('Call client'));
    expect(Linking.openURL).toHaveBeenCalled();
  });

  it('shows loading indicator during async actions', async () => {
    let resolve: (v: any) => void;
    // @ts-expect-error vi.Mock type
    (api.apiRequest as any).mockImplementationOnce(
      () => new Promise(res => { resolve = res; })
    );
    const { getByTestId } = render(<ClientProfile />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
    // Finish loading
    act(() => resolve!(mockClient));
  });
});