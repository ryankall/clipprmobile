import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { router } from 'expo-router';
import Invoice from '../app/(tabs)/invoice';
import Dashboard from '../app/(tabs)/index';

// Mock router
vi.mock('expo-router', () => {
  const actual = vi.importActual('expo-router');
  return {
    ...actual,
    router: {
      push: vi.fn(),
      replace: vi.fn(),
      setParams: vi.fn(),
    },
    useLocalSearchParams: vi.fn(),
  };
});

const mockClient = { id: 1, name: 'Test Client', phone: '123', email: 'test@example.com' };
const mockServices = [
  { id: 10, name: 'Cut', price: '30', category: 'Haircuts', duration: 30, isActive: true },
  { id: 11, name: 'Beard', price: '20', category: 'Beard', duration: 15, isActive: true },
];

const mockAppointment = {
  id: 100,
  client: mockClient,
  appointmentServices: [{ service: mockServices[0] }, { service: mockServices[1] }],
  services: [],
  service: null,
  scheduledAt: new Date().toISOString(),
  duration: 45,
  price: 50,
  status: 'confirmed',
};

describe('Invoice Modal Prefill Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset params
    require('expo-router').useLocalSearchParams.mockReturnValue({});
  });

  it('navigates to invoice tab with correct params and opens modal with prefill', async () => {
    // Mock Dashboard with a current appointment
    const { getByText } = render(<Dashboard />);
    // Simulate current appointment in state
    // (You may need to mock useAuth, useState, or useQuery as needed for your app's state management)
    // For this test, we focus on the navigation call
    // Simulate pressing the Invoice button
    act(() => {
      fireEvent.press(getByText('Invoice'));
    });

    // Should navigate to invoice tab with correct params
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(tabs)/invoice',
      params: {
        prefillClientId: mockClient.id,
        prefillServices: JSON.stringify([mockServices[0].id, mockServices[1].id]),
      },
    });
  });

  it('opens modal and pre-fills form when params are present and changes', async () => {
    // Mock params for invoice screen
    require('expo-router').useLocalSearchParams.mockReturnValue({
      prefillClientId: mockClient.id,
      prefillServices: JSON.stringify([mockServices[0].id, mockServices[1].id]),
    });

    // Render Invoice tab
    const { getByText, queryByText } = render(
      <Invoice />
    );

    // Modal should open and show client name and both services
    await waitFor(() => {
      expect(getByText('Create Invoice')).toBeTruthy();
      expect(getByText('Test Client')).toBeTruthy();
      expect(getByText('Cut')).toBeTruthy();
      expect(getByText('Beard')).toBeTruthy();
    });

    // Close modal
    act(() => {
      fireEvent.press(getByText('Cancel'));
    });

    // Modal should close
    await waitFor(() => {
      expect(queryByText('Create Invoice')).toBeNull();
    });

    // Simulate param change (new client/services)
    require('expo-router').useLocalSearchParams.mockReturnValue({
      prefillClientId: mockClient.id,
      prefillServices: JSON.stringify([mockServices[1].id]),
    });

    // Re-render
    act(() => {
      // This triggers the effect
      render(<Invoice />);
    });

    // Modal should re-open with new prefill
    await waitFor(() => {
      expect(getByText('Create Invoice')).toBeTruthy();
      expect(getByText('Test Client')).toBeTruthy();
      expect(getByText('Beard')).toBeTruthy();
    });
  });
});