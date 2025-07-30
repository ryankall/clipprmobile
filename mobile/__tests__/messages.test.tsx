import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Messages from '../app/(tabs)/messages';

// NOTE: Ionicons renders icons as glyphs, so we must check for the icon's glyph string.
// This is brittle and may break if the icon font changes. For robust tests, add testIDs to icons.

const unreadMessage = {
  id: 1,
  clientId: 1,
  customerName: 'John Doe',
  subject: 'Test Subject',
  message: 'Test unread message',
  status: 'unread',
  priority: 'normal',
  createdAt: new Date().toISOString(),
};

const readMessage = {
  ...unreadMessage,
  status: 'read',
};

describe('Messages screen', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((url, options) => {
      if (url.includes('/api/messages') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([unreadMessage])),
        });
      }
      if (url.includes(`/api/messages/${unreadMessage.id}/read`) && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(readMessage)),
        });
      }
      // fallback
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('[]'),
      });
    });
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('marks message as read and updates UI on tap', async () => {
    const { getByText, findByText, getAllByText } = render(<Messages />);

    // Wait for the unread message to appear
    const messageSubject = await findByText('Test Subject');
    expect(messageSubject).toBeTruthy();

    // The unread message card should have the gold border (borderLeftColor: #F59E0B)
    const unreadCard = messageSubject.parent?.parent;
    expect(unreadCard?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderLeftColor: '#F59E0B' }),
      ])
    );

    // Tap the unread message (TouchableOpacity is parent?.parent?.parent)
    const touchable = unreadCard?.parent;
    expect(touchable).toBeTruthy();
    if (!touchable) throw new Error('Could not find TouchableOpacity for message card');
    fireEvent.press(touchable);

    // Wait for PATCH to be called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/messages/${unreadMessage.id}/read`),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    // After marking as read, the card should NOT have the gold border
    await waitFor(() => {
      const updatedCard = getByText('Test Subject').parent?.parent;
      expect(updatedCard?.props.style).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderLeftColor: '#F59E0B' }),
        ])
      );
    });

    // The text color should be gray (#9CA3AF)
    const customerNameText = getByText('John Doe');
    expect(customerNameText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#9CA3AF' }),
      ])
    );

    // The icon should be mail-open-outline (read)
    // This is brittle: checks for the icon's glyph string (may break if icon font changes)
    // If you know the glyph for "mail-open-outline", use it here, e.g. '\uF10C'
    // Otherwise, just check that the unread icon is gone and the card is visually read
    // Example (replace 'mail-open-outline' with actual glyph if known):
    // expect(getAllByText('mail-open-outline').length).toBeGreaterThan(0);
  });
  it('opens the message detail modal with correct details, can be closed and re-opened', async () => {
    const { getByText, queryByText, findByText, getAllByRole } = render(<Messages />);

    // Wait for the message to appear
    const messageSubject = await findByText('Test Subject');
    expect(messageSubject).toBeTruthy();

    // Tap the message card to open the modal
    const messageCard = messageSubject.parent?.parent;
    const touchable = messageCard?.parent;
    expect(touchable).toBeTruthy();
    if (touchable) {
      fireEvent.press(touchable);
    } else {
      throw new Error('Could not find TouchableOpacity for message card');
    }

    // Modal should appear with correct details
    const modalSubject = await findByText('Test Subject');
    expect(modalSubject).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Test unread message')).toBeTruthy();

    // Find and press the close button (should be the button with the close icon in the modal header)
    // We expect the close button to be the second button in the modal (first is not in header)
    const modalButtons = getAllByRole('button');
    // Find the button that contains the close icon
    const closeButton = modalButtons.find(btn =>
      // Look for a child with props.name === 'close'
      Array.isArray(btn.props.children)
        ? btn.props.children.some(
            (child: any) => child && child.props && child.props.name === 'close'
          )
        : btn.props.children && btn.props.children.props && btn.props.children.props.name === 'close'
    );
    expect(closeButton).toBeTruthy();
    if (closeButton) {
      fireEvent.press(closeButton);
    } else {
      throw new Error('Could not find close button in modal');
    }

    // Modal should be closed (subject and message text not visible)
    await waitFor(() => {
      expect(queryByText('Test unread message')).toBeNull();
    });

    // Re-open the modal by pressing the message again
    if (touchable) {
      fireEvent.press(touchable);
    }

    // Modal should re-appear with correct details
    const reopenedModalSubject = await findByText('Test Subject');
    expect(reopenedModalSubject).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Test unread message')).toBeTruthy();
  });
it('does NOT send a mark-as-read request when opening an already read message', async () => {
  // Mock fetch to return a read message
  const readMessage = {
    id: 2,
    clientId: 2,
    customerName: 'Jane Smith',
    subject: 'Read Subject',
    message: 'Test read message',
    status: 'read',
    priority: 'normal',
    createdAt: new Date().toISOString(),
  };
  const fetchMock = vi.fn((url, options) => {
    if (url.includes('/api/messages') && (!options || options.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([readMessage])),
      });
    }
    // Should NOT be called for PATCH in this test
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });
  });
  global.fetch = fetchMock as any;

  const { findByText } = render(<Messages />);

  // Wait for the read message to appear
  const messageSubject = await findByText('Read Subject');
  expect(messageSubject).toBeTruthy();

  // Tap the read message card (parent?.parent?.parent)
  const readCard = messageSubject.parent?.parent;
  const touchable = readCard?.parent;
  expect(touchable).toBeTruthy();
  if (!touchable) throw new Error('Could not find TouchableOpacity for message card');
  fireEvent.press(touchable);

  // Wait a moment to allow any effects to run
  await waitFor(() => {
    // Ensure PATCH to mark as read was NOT called
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining(`/api/messages/${readMessage.id}/read`),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
});