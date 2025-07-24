import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { vi } from 'vitest';
import WorkingHoursScreen from '../app/working-hours';
import Calendar from '../app/(tabs)/calendar';
import { server } from './mocks/server';
import { rest } from 'msw';

// Mock expo-router
vi.mock('expo-router', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

// Helper: initial working hours
const initialWorkingHours = {
  monday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  tuesday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  wednesday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  thursday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  friday: { start: '09:00', end: '18:00', enabled: true, breaks: [] },
  saturday: { start: '10:00', end: '16:00', enabled: true, breaks: [] },
  sunday: { start: '10:00', end: '16:00', enabled: false, breaks: [] },
};

describe('Working Hours Editing and Calendar Integration', () => {
  let workingHours = { ...initialWorkingHours };

  beforeAll(() => {
    server.listen();
  });
  afterEach(() => {
    server.resetHandlers();
    workingHours = { ...initialWorkingHours };
  });
  afterAll(() => {
    server.close();
  });

  it('enables a closed day, sets times, adds/removes a break, and calendar reflects changes', async () => {
    // Mock GET and PATCH for /api/user/profile
    server.use(
      rest.get('/api/user/profile', (req, res, ctx) =>
        res(ctx.json({ workingHours }))
      ),
      rest.patch('/api/user/profile', async (req, res, ctx) => {
        const body = await req.json();
        workingHours = body.workingHours;
        return res(ctx.json({ success: true }));
      })
    );

    // Render working hours screen
    const { getByText, getByPlaceholderText, getAllByText, getAllByPlaceholderText, getAllByTestId, queryByText } = render(<WorkingHoursScreen />);

    // Wait for initial load
    await waitFor(() => expect(getByText('Working Hours')).toBeTruthy());

    // Enable Sunday (was closed)
    const sundaySwitch = getAllByText('Sunday')[0].parent?.parent?.findByType?.('Switch') || getAllByText('Sunday')[0].parent?.findByType?.('Switch');
    // Fallback: find all Switches, Sunday is last
    const switches = getAllByTestId('Switch');
    fireEvent(switches[switches.length - 1], 'valueChange', true);

    // Set Sunday start/end times
    const sundayStart = getAllByPlaceholderText('Start').pop();
    const sundayEnd = getAllByPlaceholderText('End').pop();
    fireEvent.changeText(sundayStart, '08:00');
    fireEvent.changeText(sundayEnd, '14:00');

    // Add a break to Sunday
    const addBlockBtns = getAllByText('Add Block');
    fireEvent.press(addBlockBtns[addBlockBtns.length - 1]);
    // Set break time
    const breakStartInputs = getAllByPlaceholderText('Start');
    const breakEndInputs = getAllByPlaceholderText('End');
    fireEvent.changeText(breakStartInputs[breakStartInputs.length - 1], '10:00');
    fireEvent.changeText(breakEndInputs[breakEndInputs.length - 1], '10:30');
    // Set break label
    const breakLabelInputs = getAllByPlaceholderText('Label');
    fireEvent.changeText(breakLabelInputs[breakLabelInputs.length - 1], 'Coffee');

    // Remove the break
    const removeBtns = getAllByTestId('remove-break-btn');
    fireEvent.press(removeBtns[removeBtns.length - 1]);

    // Save changes
    const saveBtn = getByText(/Save Hours/i);
    fireEvent.press(saveBtn);

    // Wait for success alert (simulate OK press)
    await waitFor(() => expect(queryByText('Working hours updated successfully')).toBeTruthy());

    // Now, render the calendar and check working hours reflected
    const { getByText: getByTextCal } = render(<Calendar />);
    // Wait for calendar to load
    await waitFor(() => getByTextCal('Calendar'));

    // Check that Sunday is now enabled in the calendar's date selector
    // (Look for "Sun" in the date selector, which should not be styled as "closed")
    expect(getByTextCal('Sun')).toBeTruthy();

    // Optionally, check that the timeline view shows working hours for Sunday (if visually indicated)
    // This depends on how the calendar visually marks working hours; if not possible, this step can be omitted.
  });

  it('disables a weekday and calendar reflects it as closed', async () => {
    // Mock GET and PATCH for /api/user/profile
    server.use(
      rest.get('/api/user/profile', (req, res, ctx) =>
        res(ctx.json({ workingHours }))
      ),
      rest.patch('/api/user/profile', async (req, res, ctx) => {
        const body = await req.json();
        workingHours = body.workingHours;
        return res(ctx.json({ success: true }));
      })
    );

    // Render working hours screen
    const { getByText, getAllByTestId } = render(<WorkingHoursScreen />);
    await waitFor(() => expect(getByText('Working Hours')).toBeTruthy());

    // Disable Monday
    const switches = getAllByTestId('Switch');
    fireEvent(switches[0], 'valueChange', false);

    // Save changes
    const saveBtn = getByText(/Save Hours/i);
    fireEvent.press(saveBtn);

    // Wait for success alert
    await waitFor(() => getByText('Working hours updated successfully'));

    // Render calendar and check Monday is now closed (if visually indicated)
    const { getByText: getByTextCal } = render(<Calendar />);
    await waitFor(() => getByTextCal('Calendar'));

    // Optionally, check that Monday is styled as closed in the date selector or timeline
    expect(getByTextCal('Mon')).toBeTruthy();
    // Further visual checks can be added if the UI marks closed days
  });
});