import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ClientProfile from '../app/clients/[id]';
import * as api from '../lib/api';
import { Alert } from 'react-native';

// Mock navigation
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '1' }),
  useRouter: () => ({
    back: vi.fn(),
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock apiRequest
const mockClient = {
  id: 1,
  name: 'John Doe',
  phone: '6467891234',
  email: 'john@example.com',
  address: '123 Main St',
  preferredStyle: 'Fade',
  notes: 'VIP client',
  loyaltyStatus: 'vip',
  totalSpent: '450.00',
  totalVisits: 12,
  lastVisit: new Date().toISOString(),
};

vi.spyOn(api, 'apiRequest').mockImplementation((method, url, body) => {
  if (method === 'GET' && url === '/api/clients/1') {
    return Promise.resolve({ ...mockClient });
  }
  if (method === 'PUT' && url === '/api/clients/1') {
    // Simulate server accepting the update and returning success
    return Promise.resolve({});
  }
  if (method === 'GET' && url.startsWith('/api/clients/1/appointments')) {
    return Promise.resolve([]);
  }
  if (method === 'GET' && url.startsWith('/api/clients/1/messages')) {
    return Promise.resolve([]);
  }
  if (method === 'GET' && url.startsWith('/api/clients/1/gallery')) {
    return Promise.resolve([]);
  }
  if (method === 'GET' && url.startsWith('/api/clients/1/invoices')) {
    return Promise.resolve([]);
  }
  return Promise.resolve([]);
});

// Silence Alert
vi.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('ClientProfile Edit', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('edits all fields, submits, and updates UI and server', async () => {
    const { getByText, getByPlaceholderText, getByLabelText, queryByDisplayValue } = render(<ClientProfile />);

    // Wait for client to load
    await waitFor(() => getByText('John Doe'));

    // Enter edit mode
    const editBtn = getByLabelText('Edit client');
    fireEvent.press(editBtn);

    // Change all fields
    fireEvent.changeText(getByPlaceholderText('Name'), 'Jane Updated');
    fireEvent.changeText(getByPlaceholderText('Phone'), '5551234567');
    fireEvent.changeText(getByPlaceholderText('Email'), 'jane@updated.com');
    fireEvent.changeText(getByPlaceholderText('Address'), '456 Updated Ave');
    fireEvent.changeText(getByPlaceholderText('Preferred Style'), 'Undercut');
    fireEvent.changeText(getByPlaceholderText('Notes'), 'Updated notes');
    // Change loyalty status to regular
    const regularBtn = getByLabelText('Set loyalty status to regular');
    fireEvent.press(regularBtn);

    // Save
    const saveBtn = getByLabelText('Save client');
    await act(async () => {
      fireEvent.press(saveBtn);
    });

    // Assert PUT was called with correct data
    expect(api.apiRequest).toHaveBeenCalledWith(
      'PUT',
      '/api/clients/1',
      expect.objectContaining({
        id: 1,
        name: 'Jane Updated',
        phone: '5551234567',
        email: 'jane@updated.com',
        address: '456 Updated Ave',
        preferredStyle: 'Undercut',
        notes: 'Updated notes',
        loyaltyStatus: 'regular',
      })
    );

    // UI updates to new values
    await waitFor(() => getByText('Jane Updated'));
    expect(getByText('456 Updated Ave')).toBeTruthy();
    expect(getByText('Undercut')).toBeTruthy();
    expect(getByText('Updated notes')).toBeTruthy();
    // Should not show VIP badge anymore
    expect(queryByDisplayValue('VIP')).toBeNull();
  });
describe('ClientProfile Message History Navigation', () => {
  it('navigates to messages tab and opens modal with correct message when a message is clicked', async () => {
    // Arrange: mock messages API to return one message
    const testMessage = {
      id: 101,
      customerName: 'Alice',
      customerPhone: '5550001111',
      message: 'Test message content',
      createdAt: new Date().toISOString(),
      services: ['Haircut'],
    };
    (api.apiRequest as vi.Mock).mockImplementation((method, url, body) => {
      if (method === 'GET' && url === '/api/clients/1') {
        return Promise.resolve({ ...mockClient });
      }
      if (method === 'GET' && url.startsWith('/api/clients/1/messages')) {
        return Promise.resolve([testMessage]);
      }
      // fallback to default
      return Promise.resolve([]);
    });

    // Mock router
    const pushMock = vi.fn();
    vi.spyOn(require('expo-router'), 'useRouter').mockReturnValue({
      back: vi.fn(),
      replace: vi.fn(),
      push: pushMock,
    });

    const { getByText, findByText } = render(<ClientProfile />);

    // Wait for client and messages to load
    await findByText('John Doe');
    await findByText('Message History (1)');
    await findByText('Haircut');

    // Act: click the message row
    const messageRow = getByText('Haircut').parent?.parent;
    if (messageRow && 'props' in messageRow && typeof messageRow.props.onPress === 'function') {
      act(() => {
        messageRow.props.onPress();
      });
    } else {
      // fallback: fireEvent on TouchableOpacity
      fireEvent.press(getByText('Haircut').parent?.parent);
    }

    // Assert: router.push called with correct params
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/messages',
      params: { messageId: testMessage.id.toString() },
    });
  });
});
});