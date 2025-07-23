import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Clients from '../app/(tabs)/clients';
import * as api from '../lib/api';
import { Linking, Alert } from 'react-native';

// Mock navigation
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock useAuth
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

// Mock apiRequest
const mockClients = [
  {
    id: 1,
    name: 'Alice Smith',
    phone: '1234567890',
    email: 'alice@example.com',
    notes: 'VIP client',
    totalSpent: '600',
    totalVisits: 15,
    lastVisit: new Date().toISOString(),
    loyaltyStatus: 'vip',
  },
  {
    id: 2,
    name: 'Bob Jones',
    phone: '5551234567',
    email: 'bob@example.com',
    notes: '',
    totalSpent: '250',
    totalVisits: 12,
    lastVisit: new Date().toISOString(),
    loyaltyStatus: 'gold',
  },
  // ...add 8 more for top 10
  ...Array.from({ length: 8 }, (_, i) => ({
    id: i + 3,
    name: `Client${i + 3}`,
    phone: `55500000${i + 3}`,
    email: `client${i + 3}@example.com`,
    notes: '',
    totalSpent: `${100 + i * 10}`,
    totalVisits: 5 + i,
    lastVisit: new Date().toISOString(),
    loyaltyStatus: 'regular',
  })),
];

const mockAnalytics = {
  bigSpenders: mockClients
    .slice(0, 5)
    .map((c, i) => ({
      name: c.name,
      totalSpent: c.totalSpent,
      appointmentCount: 5 + i,
    })),
  mostVisited: mockClients
    .slice(0, 5)
    .map((c, i) => ({
      name: c.name,
      totalVisits: c.totalVisits,
      lastVisit: c.lastVisit,
    })),
  biggestTippers: mockClients
    .slice(0, 5)
    .map((c, i) => ({
      name: c.name,
      totalTips: (50 + i * 5).toString(),
      tipPercentage: 10 + i,
    })),
};

jest.spyOn(api, 'apiRequest').mockImplementation((method, url) => {
  if (url === '/api/clients') return Promise.resolve(mockClients);
  if (url === '/api/clients/stats') return Promise.resolve(mockAnalytics);
  if (url.includes('/appointments')) return Promise.resolve([{ id: 1, date: '2025-07-20' }]);
  if (url.includes('/messages')) return Promise.resolve([{ id: 1, text: 'Hello' }]);
  if (url.includes('/gallery')) return Promise.resolve([{ id: 1, url: 'img.jpg' }]);
  if (method === 'PUT' && url.startsWith('/api/clients/')) return Promise.resolve({});
  return Promise.resolve([]);
});

// Mock Linking
jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());

// Silence Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('Clients Tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders analytics for top 10 clients', async () => {
    const { getByText, queryByText } = render(<Clients />);
    // Wait for analytics to load
    await waitFor(() => expect(queryByText('Top 10 Client Analytics')).toBeTruthy());
    // Big Spenders
    expect(getByText('Big Spenders')).toBeTruthy();
    mockAnalytics.bigSpenders.forEach((c) => {
      expect(getByText(c.name)).toBeTruthy();
      expect(getByText(`$${c.totalSpent}`)).toBeTruthy();
    });
    // Most Visited
    expect(getByText('Most Visited')).toBeTruthy();
    mockAnalytics.mostVisited.forEach((c) => {
      expect(getByText(c.name)).toBeTruthy();
      expect(getByText(`${c.totalVisits} visits`)).toBeTruthy();
    });
    // Biggest Tippers
    expect(getByText('Biggest Tippers')).toBeTruthy();
    mockAnalytics.biggestTippers.forEach((c) => {
      expect(getByText(c.name)).toBeTruthy();
      expect(getByText(`$${c.totalTips}`)).toBeTruthy();
    });
  });

  it('renders all client cards and their info', async () => {
    const { getByText, getAllByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    mockClients.forEach((client) => {
      expect(getByText(client.name)).toBeTruthy();
      if (client.phone) expect(getByText(client.phone)).toBeTruthy();
    });
    // Check total clients count
    expect(getByText(`All Clients (${mockClients.length})`)).toBeTruthy();
    // Check summary cards
    expect(getByText('Total Clients')).toBeTruthy();
    expect(getByText('VIP Clients')).toBeTruthy();
it('navigates to client profile page and renders correct client data', async () => {
    const { getByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    const clientCard = getByText('Alice Smith');
    fireEvent.press(clientCard);
    // Should have navigated to /client-profile?id=1 (mocked router.push)
    const { router } = require('expo-router');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/client-profile', params: { id: '1' } });
    // The actual client profile rendering is tested in client-profile.test.tsx
  });

  it('client detail modal action buttons work', async () => {
    const { getByText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    fireEvent.press(getByText('Alice Smith'));
    // Edit
    fireEvent.press(getByText('Edit'));
    expect(getByText('Edit Client')).toBeTruthy();
    fireEvent.press(getByText('Cancel'));
    // Call
    fireEvent.press(getByText('Alice Smith'));
    fireEvent.press(getByText('Call'));
    expect(Alert.alert).toHaveBeenCalledWith('Call', expect.stringContaining('1234567890'));
    // Appointments
    fireEvent.press(getByText('Alice Smith'));
    fireEvent.press(getByText('Appointments'));
    await waitFor(() => expect(queryByText('Recent Appointments')).toBeTruthy());
    fireEvent.press(getByText('Close'));
    // Messages
    fireEvent.press(getByText('Alice Smith'));
    fireEvent.press(getByText('Messages'));
    await waitFor(() => expect(queryByText('Message History')).toBeTruthy());
    fireEvent.press(getByText('Close'));
    // Gallery
    fireEvent.press(getByText('Alice Smith'));
    fireEvent.press(getByText('Gallery'));
    await waitFor(() => expect(queryByText('Photo Gallery')).toBeTruthy());
    fireEvent.press(getByText('Close'));
  });
it('opens and closes the add client modal', async () => {
    const { getByLabelText, getByText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    const addBtn = getByLabelText('Open add client modal');
    fireEvent.press(addBtn);
    expect(getByText('Add New Client')).toBeTruthy();
    // Cancel closes modal
    const cancelBtn = getByLabelText('Cancel add client');
    fireEvent.press(cancelBtn);
    await waitFor(() => expect(queryByText('Add New Client')).toBeNull());
  });

  it('shows validation errors in add client modal', async () => {
    const { getByLabelText, getByText, getByPlaceholderText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    fireEvent.press(getByLabelText('Open add client modal'));
    // Try to add with no name
    const addConfirm = getByLabelText('Confirm add client');
    fireEvent.press(addConfirm);
    expect(getByText('Name is required')).toBeTruthy();
    // Enter name, but no phone/email
    fireEvent.changeText(getByPlaceholderText('Name'), 'Test User');
    fireEvent.press(addConfirm);
    expect(getByText('Phone or email is required')).toBeTruthy();
  });

  it('adds a new client and displays it in the list', async () => {
    const { getByLabelText, getByText, getByPlaceholderText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    fireEvent.press(getByLabelText('Open add client modal'));
    fireEvent.changeText(getByPlaceholderText('Name'), 'New Client');
    fireEvent.changeText(getByPlaceholderText('Phone'), '9999999999');
    fireEvent.press(getByLabelText('Confirm add client'));
    await waitFor(() => expect(queryByText('Add New Client')).toBeNull());
    // New client should appear at the top of the list
    expect(getByText('New Client')).toBeTruthy();
    expect(getByText('9999999999')).toBeTruthy();
  });
  });

  it('filters clients by search', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    const search = getByPlaceholderText('Search clients...');
    fireEvent.changeText(search, 'Alice');
    expect(getByText('Alice Smith')).toBeTruthy();
    expect(queryByText('Bob Jones')).toBeNull();
  });

  it('opens and closes the edit client modal, edits details, and saves', async () => {
    const { getByLabelText, getByDisplayValue, getByPlaceholderText, getByText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    // Open edit modal
    const editBtn = getByLabelText('Edit client');
    fireEvent.press(editBtn);
    // Modal fields
    expect(getByDisplayValue('Alice Smith')).toBeTruthy();
    const nameInput = getByPlaceholderText('Name');
    fireEvent.changeText(nameInput, 'Alice Updated');
    // Save
    const saveBtn = getByText('Save');
    fireEvent.press(saveBtn);
    await waitFor(() => expect(queryByText('Alice Updated')).toBeTruthy());
  });

  it('calls the client when call button is pressed', async () => {
    const { getByLabelText, getByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    const callBtn = getByLabelText('Call client');
    fireEvent.press(callBtn);
    expect(Linking.openURL).toHaveBeenCalledWith('tel:1234567890');
  });

  it('opens and closes the appointments modal', async () => {
    const { getByLabelText, getByText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    const apptBtn = getByLabelText('View recent appointments');
    fireEvent.press(apptBtn);
    await waitFor(() => expect(getByText('Recent Appointments')).toBeTruthy());
    // Close modal
    const closeBtn = getByText('Close');
    fireEvent.press(closeBtn);
    await waitFor(() => expect(queryByText('Recent Appointments')).toBeNull());
  });

  it('opens and closes the message history modal', async () => {
    const { getByLabelText, getByText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    const msgBtn = getByLabelText('View message history');
    fireEvent.press(msgBtn);
    await waitFor(() => expect(getByText('Message History')).toBeTruthy());
    // Close modal
    const closeBtn = getByText('Close');
    fireEvent.press(closeBtn);
    await waitFor(() => expect(queryByText('Message History')).toBeNull());
  });

  it('opens and closes the photo gallery modal', async () => {
    const { getByLabelText, getByText, queryByText } = render(<Clients />);
    await waitFor(() => getByText('Clients'));
    const galleryBtn = getByLabelText('Browse photo gallery');
    fireEvent.press(galleryBtn);
    await waitFor(() => expect(getByText('Photo Gallery')).toBeTruthy());
    // Close modal
    const closeBtn = getByText('Close');
    fireEvent.press(closeBtn);
    await waitFor(() => expect(queryByText('Photo Gallery')).toBeNull());
  });

  it('shows empty state when no clients', async () => {
    (api.apiRequest as jest.Mock).mockImplementationOnce((method, url) => {
      if (url === '/api/clients') return Promise.resolve([]);
      if (url === '/api/clients/stats') return Promise.resolve(mockAnalytics);
      return Promise.resolve([]);
    });
    const { getByText } = render(<Clients />);
    await waitFor(() => getByText('No clients found'));
    expect(getByText('Add your first client to get started')).toBeTruthy();
  });

  it('shows analytics loading and error states', async () => {
    (api.apiRequest as jest.Mock)
      .mockImplementationOnce((method, url) => Promise.resolve(mockClients))
      .mockImplementationOnce((method, url) => Promise.reject('error'));
    const { getByText } = render(<Clients />);
    await waitFor(() => getByText('Loading analytics...'));
    await waitFor(() => getByText('Failed to load analytics'));
  });
});