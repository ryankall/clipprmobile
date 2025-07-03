import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import Dashboard from '@/pages/dashboard';

// Mock the hooks
vi.mock('@tanstack/react-query');
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      profileImageUrl: null,
    },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseQuery = vi.mocked(useQuery);

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    mockUseQuery.mockImplementation(() => ({
      data: undefined,
      isLoading: true,
      error: null,
    }));

    render(<Dashboard />);
    
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    // Loading indicators should be present
    expect(screen.getAllByText('Loading...')).toHaveLength(3);
  });

  it('displays dashboard stats when loaded', async () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          dailyEarnings: '150.00',
          appointmentCount: 3,
          weeklyEarnings: '750.00',
          monthlyEarnings: '3200.00',
          totalClients: 45,
        },
        isLoading: false,
        error: null,
      })
      .mockReturnValueOnce({
        data: [
          {
            id: 1,
            clientId: 1,
            scheduledAt: new Date(),
            client: { name: 'John Doe' },
            service: { name: 'Haircut' },
            status: 'confirmed',
            price: '35.00',
            duration: 45,
          },
        ],
        isLoading: false,
        error: null,
      })
      .mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('$750.00')).toBeInTheDocument();
      expect(screen.getByText('$3,200.00')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  it('displays "no appointments" message when no appointments exist', async () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          dailyEarnings: '0.00',
          appointmentCount: 0,
          weeklyEarnings: '0.00',
          monthlyEarnings: '0.00',
          totalClients: 0,
        },
        isLoading: false,
        error: null,
      })
      .mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No confirmed appointments scheduled for today')).toBeInTheDocument();
    });
  });

  it('displays current and next appointments correctly', async () => {
    const now = new Date();
    const currentAppointment = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    const nextAppointment = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

    mockUseQuery
      .mockReturnValueOnce({
        data: {
          dailyEarnings: '70.00',
          appointmentCount: 2,
          weeklyEarnings: '350.00',
          monthlyEarnings: '1500.00',
          totalClients: 25,
        },
        isLoading: false,
        error: null,
      })
      .mockReturnValueOnce({
        data: [
          {
            id: 1,
            clientId: 1,
            scheduledAt: currentAppointment,
            client: { name: 'John Doe', phone: '(555) 123-4567' },
            service: { name: 'Haircut' },
            status: 'confirmed',
            price: '35.00',
            duration: 45,
            address: '123 Main St',
          },
          {
            id: 2,
            clientId: 2,
            scheduledAt: nextAppointment,
            client: { name: 'Jane Smith', phone: '(555) 987-6543' },
            service: { name: 'Beard Trim' },
            status: 'confirmed',
            price: '25.00',
            duration: 20,
            address: '456 Oak St',
          },
        ],
        isLoading: false,
        error: null,
      })
      .mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows pending appointments section', async () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          dailyEarnings: '0.00',
          appointmentCount: 0,
          weeklyEarnings: '0.00',
          monthlyEarnings: '0.00',
          totalClients: 0,
        },
        isLoading: false,
        error: null,
      })
      .mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Pending Confirmations')).toBeInTheDocument();
    });
  });
});