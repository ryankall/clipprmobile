import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Dashboard from '../app/(tabs)/index';
import * as api from '../lib/api';
import { router } from 'expo-router';
import { Alert, Linking } from 'react-native';

// Mock router
vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
  },
}));

// Mock API
const mockStats = {
  dailyEarnings: 120,
  appointmentCount: 3,
  clientCount: 10,
};
const mockUser = {
  firstName: 'Test',
};
const mockCurrentAppointment = {
  id: 1,
  scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min from now
  price: '45.00',
  client: { name: 'John Doe', phone: '1234567890' },
  service: { name: 'Haircut' },
  address: '123 Main St',
};
const mockNextAppointment = {
  id: 2,
  scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  price: '35.00',
  client: { name: 'Jane Smith', phone: '9876543210' },
  service: { name: 'Beard Trim' },
  address: '456 Oak Ave',
};
const mockAppointments = [mockCurrentAppointment, mockNextAppointment];
const mockPending = [
  {
    id: 3,
    scheduledAt: new Date().toISOString(),
    price: '50.00',
    client: { name: 'Pending Client', phone: '5555555555' },
    service: { name: 'Shave' },
    address: '789 Pine Rd',
  },
];

vi.spyOn(api, 'apiRequest').mockImplementation((method, endpoint) => {
  if (endpoint === '/api/dashboard') return Promise.resolve(mockStats);
  if (endpoint === '/api/appointments/today') return Promise.resolve(mockAppointments);
  if (endpoint === '/api/messages/unread-count') return Promise.resolve({ count: 2 });
  if (endpoint === '/api/appointments/pending') return Promise.resolve(mockPending);
  return Promise.resolve([]);
});

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

// Mock Alert and Linking
vi.spyOn(Alert, 'alert').mockImplementation(() => {});
vi.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

describe('Dashboard (Mobile)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard stats and greeting', async () => {
    const { getByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText(/Good (Morning|Afternoon|Evening), Test!/)).toBeTruthy();
      expect(getByText("Today's Earnings")).toBeTruthy();
      expect(getByText("Appointments")).toBeTruthy();
      expect(getByText("Total Clients")).toBeTruthy();
      expect(getByText("Messages")).toBeTruthy();
      expect(getByText('$120')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('10')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
    });
  });

  it('renders Current Appointment section and handles all actions', async () => {
    const { getByText, getAllByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Current Appointment')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Haircut')).toBeTruthy();
      expect(getByText('$45.00')).toBeTruthy();
    });

    // Call button
    fireEvent.press(getAllByText('Call')[0]);
    expect(Linking.openURL).toHaveBeenCalledWith('tel:1234567890');

    // Navigate button
    fireEvent.press(getAllByText('Navigate')[0]);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('maps.google.com'));

    // No-Show button
    fireEvent.press(getByText('No-Show'));
    expect(Alert.alert).toHaveBeenCalledWith('Mark as No-Show', 'Feature coming soon.');

    // Invoice button
    fireEvent.press(getByText('Invoice'));
    expect(Alert.alert).toHaveBeenCalledWith('Create Invoice', 'Feature coming soon.');
  });

  it('renders Next Appointment section and handles all actions', async () => {
    const { getByText, getAllByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Next Appointment')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
      expect(getByText('Beard Trim')).toBeTruthy();
      expect(getByText('$35.00')).toBeTruthy();
    });

    // Call button
    fireEvent.press(getAllByText('Call')[1]);
    expect(Linking.openURL).toHaveBeenCalledWith('tel:9876543210');

    // Navigate button
    fireEvent.press(getAllByText('Navigate')[1]);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('maps.google.com'));

    // No-Show button
    fireEvent.press(getAllByText('No-Show')[1]);
    expect(Alert.alert).toHaveBeenCalledWith('Mark as No-Show', 'Feature coming soon.');

    // Invoice button
    fireEvent.press(getAllByText('Invoice')[1]);
    expect(Alert.alert).toHaveBeenCalledWith('Create Invoice', 'Feature coming soon.');
  });

  it('renders Quick Actions and triggers navigation', async () => {
    const { getByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('New Appointment')).toBeTruthy();
      expect(getByText('View Calendar')).toBeTruthy();
      expect(getByText('Client List')).toBeTruthy();
      expect(getByText('Messages')).toBeTruthy();
    });

    fireEvent.press(getByText('New Appointment'));
    expect(router.push).toHaveBeenCalledWith('/appointments/new');

    fireEvent.press(getByText('View Calendar'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/calendar');

    fireEvent.press(getByText('Client List'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/clients');

    fireEvent.press(getByText('Messages'));
    expect(router.push).toHaveBeenCalledWith('/messages');
  });

  it("renders Today's Appointments list", async () => {
    const { getByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText("Today's Appointments")).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  it('renders Recent Work section and handles View button', async () => {
    const { getByText, getAllByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Recent Work')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    fireEvent.press(getAllByText('View')[0]);
    expect(Alert.alert).toHaveBeenCalledWith('View Appointment', 'Feature coming soon.');
  });

  it('handles edge case: no appointments', async () => {
    (api.apiRequest as any).mockImplementationOnce((method: string, endpoint: string) => {
      if (endpoint === '/api/appointments/today') return Promise.resolve([]);
      if (endpoint === '/api/dashboard') return Promise.resolve(mockStats);
      if (endpoint === '/api/messages/unread-count') return Promise.resolve({ count: 0 });
      return Promise.resolve([]);
    });
    const { getByText, queryByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Recent Work')).toBeTruthy();
      expect(getByText('No recent appointments')).toBeTruthy();
      expect(queryByText('Current Appointment')).toBeNull();
      expect(queryByText('Next Appointment')).toBeNull();
      expect(queryByText("Today's Appointments")).toBeNull();
    });
  });

  it('handles edge case: not authenticated', async () => {
    vi.mocked(require('../hooks/useAuth')).useAuth.mockReturnValueOnce({
      user: null,
      isAuthenticated: false,
    });
    const { getByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Please sign in to access your dashboard')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
    });
    fireEvent.press(getByText('Sign In'));
    expect(router.push).toHaveBeenCalledWith('/auth');
  });

  it('handles edge case: no pending appointments', async () => {
    (api.apiRequest as any).mockImplementation((method: string, endpoint: string) => {
      if (endpoint === '/api/appointments/pending') return Promise.resolve([]);
      if (endpoint === '/api/dashboard') return Promise.resolve(mockStats);
      if (endpoint === '/api/appointments/today') return Promise.resolve(mockAppointments);
      if (endpoint === '/api/messages/unread-count') return Promise.resolve({ count: 2 });
      return Promise.resolve([]);
    });
    const { getByText } = render(<Dashboard />);
    await waitFor(() => {
      expect(getByText('Recent Work')).toBeTruthy();
    });
  });
});