import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Settings from '../app/(tabs)/settings';

// Mock hooks and dependencies
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, signOut: vi.fn() }),
}));
vi.mock('../lib/api', () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
}));
vi.mock('@react-native-picker/picker', () => ({
  Picker: ({ children }: any) => <>{children}</>,
  Item: ({ children }: any) => <>{children}</>,
}));
vi.mock('expo-router', () => ({
  router: {
    replace: vi.fn(),
  },
}));
vi.mock('react-native/Libraries/Animated/NativeAnimatedHelper'); // Silence warning

describe('Settings Tab Navigation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows Profile section by default', async () => {
    const { getByText } = render(<Settings />);
    await waitFor(() => expect(getByText('Profile & Business Info')).toBeTruthy());
  });

  it('switches to Notifications tab', async () => {
    const { getByText, queryByText } = render(<Settings />);
    fireEvent.press(getByText('Notifications'));
    await waitFor(() => expect(getByText('Push Notifications')).toBeTruthy());
    expect(queryByText('Profile & Business Info')).toBeNull();
  });

  it('switches to Blocked tab', async () => {
    const { getByText, queryByText } = render(<Settings />);
    fireEvent.press(getByText('Blocked'));
    await waitFor(() => expect(getByText('Blocked Clients')).toBeTruthy());
    expect(queryByText('Profile & Business Info')).toBeNull();
  });

  it('switches to Payment tab', async () => {
    const { getByText, queryByText } = render(<Settings />);
    fireEvent.press(getByText('Payment'));
    await waitFor(() => expect(getByText('Payment Settings')).toBeTruthy());
    expect(queryByText('Profile & Business Info')).toBeNull();
  });

  it('switches to Subscription tab', async () => {
    const { getByText, queryByText } = render(<Settings />);
    fireEvent.press(getByText('Subscription'));
    await waitFor(() => expect(getByText('Subscription Plan')).toBeTruthy());
    expect(queryByText('Profile & Business Info')).toBeNull();
  });

  it('switches to Help tab', async () => {
    const { getByText, queryByText } = render(<Settings />);
    fireEvent.press(getByText('Help'));
    await waitFor(() => expect(getByText('Help & Support')).toBeTruthy());
    expect(queryByText('Profile & Business Info')).toBeNull();
  });
});