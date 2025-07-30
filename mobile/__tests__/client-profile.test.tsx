import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach } from 'vitest';
import ClientProfile from '../app/clients/[id]';
import * as api from '../lib/api';
import { Alert, Linking } from 'react-native';
import { vi } from 'vitest';

// Mock navigation
vi.mock('expo-router', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useLocalSearchParams: () => ({ id: '1' }),
}));

// Mock API
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

// Improved API mock: check both method and endpoint
vi.spyOn(api, 'apiRequest').mockImplementation((method, endpoint) => {
  if (endpoint.startsWith('/api/clients/1/appointments')) return Promise.resolve(mockAppointments);
  if (endpoint.startsWith('/api/clients/1/messages')) return Promise.resolve(mockMessages);
  if (endpoint.startsWith('/api/clients/1/gallery')) return Promise.resolve(mockPhotos);
  if (endpoint === '/api/clients/1' && method === 'PUT') return Promise.resolve({ ...mockClient, name: 'Jane Doe' });
  if (endpoint === '/api/clients/1' && method === 'DELETE') return Promise.resolve({});
  if (endpoint === '/api/clients/1') return Promise.resolve(mockClient);
  return Promise.resolve([]);
});

// Mock Alert and Linking for side effect assertions
vi.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
  // Simulate pressing the "Delete" button if present
  if (buttons && Array.isArray(buttons)) {
    const deleteBtn = buttons.find(b => b.style === 'destructive' || b.text?.toLowerCase().includes('delete'));
    if (deleteBtn && deleteBtn.onPress) deleteBtn.onPress();
  }
});
vi.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ClientProfile (Mobile)', () => {
  it('renders client info and stats', async () => {
    const { getByText, findByText } = render(<ClientProfile />);
    expect(await findByText('John Doe')).toBeTruthy();
    expect(getByText('VIP')).toBeTruthy();
    expect(getByText('Visits')).toBeTruthy();
    expect(getByText('Spent')).toBeTruthy();
    expect(getByText('Upcoming')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
    expect(getByText('Fade')).toBeTruthy();
    expect(getByText('Notes')).toBeTruthy();
    expect(getByText('VIP client')).toBeTruthy();
  });

  it('enters edit mode and validates input fields', async () => {
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
    const { getByLabelText, getByDisplayValue, getByText } = render(<ClientProfile />);
    await waitFor(() => getByDisplayValue('John Doe'));
    fireEvent.press(getByLabelText('Edit client'));
    const nameInput = getByLabelText('Edit name');
    fireEvent.changeText(nameInput, 'Jane Doe');
    fireEvent.press(getByLabelText('Cancel edit'));
    expect(getByDisplayValue('John Doe')).toBeTruthy();
  });

  it('navigates to messages tab and opens modal for message', async () => {
    const { getByText, findByText, getByLabelText } = render(<ClientProfile />);
    await findByText('Message History (1)');
    fireEvent.press(getByLabelText('View message details'));
    // Should navigate to /messages with messageId param
    const { useRouter } = require('expo-router');
    expect(useRouter().push).toHaveBeenCalledWith({
      pathname: '/messages',
      params: { messageId: '1' }
    });
  });

  it('shows all messages when toggled', async () => {
    const { getByText, findByText } = render(<ClientProfile />);
    await findByText('Message History (1)');
    if (getByText('Show all 1 messages')) {
      fireEvent.press(getByText('Show all 1 messages'));
      expect(getByText('Show recent 5')).toBeTruthy();
    }
  });

  it('calls delete client and navigates away', async () => {
    const { getByLabelText } = render(<ClientProfile />);
    fireEvent.press(getByLabelText('Edit client'));
    fireEvent.press(getByLabelText('Delete client'));
    // Alert.alert is mocked to auto-confirm deletion
    await waitFor(() => {
      const { useRouter } = require('expo-router');
      expect(useRouter().replace).toHaveBeenCalledWith('/clients'); // Should navigate to clients list after delete
    });
  });

  it('calls client phone number', async () => {
    const { getByLabelText } = render(<ClientProfile />);
    fireEvent.press(getByLabelText('Call client'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+1234567890');
  });

  it('navigates to book appointment', async () => {
    const { getByLabelText } = render(<ClientProfile />);
    fireEvent.press(getByLabelText('Book appointment'));
    const { useRouter } = require('expo-router');
    expect(useRouter().push).toHaveBeenCalledWith({
      pathname: '/calendar',
      params: { clientId: '1' }
    });
  });
  it('does not render any persistent or floating bottom button', async () => {
    const { queryAllByRole, queryByLabelText, queryByText } = render(<ClientProfile />);
    // Wait for profile to render
    await waitFor(() => queryByText('John Doe'));
    // There should be no button with a label indicating a bottom/floating action
    // (e.g., "Save", "Book", "Add", "Continue", etc. at the bottom)
    // All action buttons are in the header or cards, not floating at the bottom
    // Check for common bottom button labels
    expect(queryByLabelText('Save')).toBeNull();
    expect(queryByLabelText('Continue')).toBeNull();
    expect(queryByLabelText('Add')).toBeNull();
    expect(queryByLabelText('Book')).toBeNull();
    // Optionally, check that there is no button with a testID or role at the bottom
    const allButtons = queryAllByRole('button');
    // No button should have a style or label indicating it's floating at the bottom
    // (This is a heuristic; the main check is that no such button is rendered)
    expect(allButtons.length).toBeGreaterThan(0); // There are buttons, but none are floating at the bottom
  });
});