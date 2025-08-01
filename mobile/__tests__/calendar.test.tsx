import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
import Calendar from '../app/(tabs)/calendar';
import * as useAuthModule from '../../mobile/hooks/useAuth';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

// Mock expo-router
vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
  },
}));

const { router } = require('expo-router');

// Mock useAuth to always be authenticated
vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
  isAuthenticated: true,
  isLoading: false,
  user: {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    createdAt: '',
    updatedAt: '',
  },
  signIn: vi.fn(),
  signOut: vi.fn(),
  checkAuth: vi.fn(),
});

// Helper: Provide appointments, including overlaps
const makeAppointments = () => [
  {
    id: 1,
    scheduledAt: new Date('2025-07-24T10:00:00Z').toISOString(),
    status: 'confirmed',
    duration: 60,
    price: 45,
    client: { id: 1, name: 'John Doe' },
    service: { id: 1, name: 'Haircut' },
    travelRequired: false,
  },
  {
    id: 2,
    scheduledAt: new Date('2025-07-24T10:30:00Z').toISOString(),
    status: 'confirmed',
    duration: 60,
    price: 50,
    client: { id: 2, name: 'Jane Smith' },
    service: { id: 2, name: 'Beard Trim' },
    travelRequired: true,
  },
  // Non-overlapping
  {
    id: 3,
    scheduledAt: new Date('2025-07-24T13:00:00Z').toISOString(),
    status: 'pending',
    duration: 30,
    price: 30,
    client: { id: 3, name: 'Alice' },
    service: { id: 3, name: 'Shave' },
    travelRequired: false,
  },
];

// Setup MSW for /api/appointments?date=...
beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => {
  server.close();
});

describe('Mobile Calendar Page', () => {
  it('shows "+" button and navigates to appointment creation', async () => {
    // Mock API to return empty appointments
    server.use(
      http.get('/api/appointments', () => HttpResponse.json([]))
    );
    const { getByTestId } = render(<Calendar />);
    const addBtn = getByTestId('add-appointment-btn');
    expect(addBtn).toBeTruthy();

    fireEvent.press(addBtn);
    expect(router.push).toHaveBeenCalledWith('/appointments/new');
  });

  it('renders overlapping appointments side-by-side in timeline view', async () => {
    // Mock API to return overlapping appointments
    server.use(
      http.get('/api/appointments', () => HttpResponse.json(makeAppointments()))
    );
    const { findByTestId, getByTestId } = render(<Calendar />);
    // Wait for both overlapping appointments to appear
    const apt1 = await findByTestId('appointment-block-1');
    const apt2 = await findByTestId('appointment-block-2');

    // Check that both are rendered and have different "left" style (side-by-side)
    const left1 = apt1.props.style.find((s: any) => s.left !== undefined)?.left;
    const left2 = apt2.props.style.find((s: any) => s.left !== undefined)?.left;
    expect(left1).not.toBe(left2);

    // Both should be visible
    expect(apt1).toBeTruthy();
    expect(apt2).toBeTruthy();
  });

  it('navigates to appointment detail when an appointment is tapped (timeline view)', async () => {
    server.use(
      http.get('/api/appointments', () => HttpResponse.json(makeAppointments()))
    );
    const { findByTestId } = render(<Calendar />);
    const apt1 = await findByTestId('appointment-block-1');
    fireEvent.press(apt1);
    expect(router.push).toHaveBeenCalledWith('/appointment-details?id=1');
  });

  it('navigates to appointment detail when an appointment is tapped (list view)', async () => {
    server.use(
      http.get('/api/appointments', () => HttpResponse.json(makeAppointments()))
    );
    const { findByTestId, getByText } = render(<Calendar />);
    // Switch to list view
    const listTab = getByText('List');
    fireEvent.press(listTab);

    // Wait for appointment card to appear
    const card = await findByTestId('appointment-card-1');
    fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith('/appointment-details?id=1');
  });

  it('shows empty state when there are no appointments', async () => {
    server.use(
      http.get('/api/appointments', () => HttpResponse.json([]))
    );
    const { findByText } = render(<Calendar />);
    expect(await findByText('No appointments')).toBeTruthy();
  });

  it('switches between timeline and list view', async () => {
    server.use(
      http.get('/api/appointments', () => HttpResponse.json(makeAppointments()))
    );
    const { getByText, findByTestId } = render(<Calendar />);
    // Timeline view by default
    expect(await findByTestId('appointment-block-1')).toBeTruthy();

    // Switch to list view
    const listTab = getByText('List');
    fireEvent.press(listTab);
    expect(await findByTestId('appointment-card-1')).toBeTruthy();

    // Switch back to timeline
    const timelineTab = getByText('Timeline');
    fireEvent.press(timelineTab);
    expect(await findByTestId('appointment-block-1')).toBeTruthy();
  });

  it('changes date when a date button is pressed', async () => {
    server.use(
      http.get('/api/appointments', () => HttpResponse.json([]))
    );
    const { getAllByText, findByText } = render(<Calendar />);
    // Find a date button (e.g., "Thu" for Thursday)
    const thursdayBtn = getAllByText(/Thu/)[0];
    fireEvent.press(thursdayBtn);
    // Should still show empty state (since API returns empty)
    expect(await findByText('No appointments')).toBeTruthy();
  });
});
import AppointmentDetails from '../app/appointment-details';

describe('Appointment Details Screen', () => {
  it('shows correct details after navigating from calendar', async () => {
    // Mock API for appointments list
    server.use(
      http.get('/api/appointments', () => HttpResponse.json(makeAppointments()))
    );
    // Mock API for appointment details
    server.use(
      http.get('/api/appointments/1', () =>
        HttpResponse.json({
          id: 1,
          scheduledAt: new Date('2025-07-24T10:00:00Z').toISOString(),
          status: 'confirmed',
          duration: 60,
          price: 45,
          client: { id: 1, name: 'John Doe' },
          service: { id: 1, name: 'Haircut' },
          travelRequired: false,
        })
      )
    );

    // Render calendar and tap appointment
    const { findByTestId } = render(<Calendar />);
    const apt1 = await findByTestId('appointment-block-1');
    fireEvent.press(apt1);

    // Render appointment details screen for id=1
    // Mock useLocalSearchParams to return id=1
    vi.mock('expo-router', () => ({
      useLocalSearchParams: () => ({ id: '1' }),
      useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
    }));

    const { findByText } = render(<AppointmentDetails />);
    // Wait for details to load
    expect(await findByText('Appointment Details')).toBeTruthy();
    expect(await findByText('Haircut')).toBeTruthy();
    expect(await findByText('John Doe')).toBeTruthy();
    expect(await findByText('confirmed')).toBeTruthy();
    expect(await findByText('$45')).toBeTruthy();
  });
});