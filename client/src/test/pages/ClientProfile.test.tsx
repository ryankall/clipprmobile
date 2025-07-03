import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { getClientDisplayName, isVipClient, getClientBadgeText } from '@/lib/clientUtils';

// Mock wouter
vi.mock('wouter', () => ({
  useParams: () => ({ id: '1' }),
  useLocation: () => ['/clients/1', vi.fn()],
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  Router: ({ children }: any) => <div>{children}</div>,
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Create a simple test component to test our utility functions
const TestComponent = ({ client }: { client: any }) => {
  return (
    <div>
      <h1 data-testid="client-name">{getClientDisplayName(client)}</h1>
      <span data-testid="vip-status">{isVipClient(client) ? 'VIP' : 'Regular'}</span>
      <span data-testid="badge-text">{getClientBadgeText(client)}</span>
    </div>
  );
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Router>
        {component}
      </Router>
    </QueryClientProvider>
  );
};

describe('ClientProfile - Client Utility Functions', () => {
  const mockRegularClient = {
    id: 1,
    name: 'John Doe',
    phone: '(555) 123-4567',
    email: 'john@example.com',
    loyaltyStatus: 'regular',
    address: '123 Main St',
    preferredStyle: 'Classic Cut',
    notes: 'Regular customer',
  };

  const mockVipClient = {
    id: 2,
    name: 'Jane Smith',
    phone: '(555) 987-6543', 
    email: 'jane@example.com',
    loyaltyStatus: 'vip',
    address: '456 Oak Ave',
    preferredStyle: 'Premium Style',
    notes: 'VIP customer',
  };

  it('should display VIP client names as "Gold"', () => {
    renderWithProviders(<TestComponent client={mockVipClient} />);
    
    const clientName = screen.getByTestId('client-name');
    expect(clientName).toHaveTextContent('Gold');
  });

  it('should display regular client names normally', () => {
    renderWithProviders(<TestComponent client={mockRegularClient} />);
    
    const clientName = screen.getByTestId('client-name');
    expect(clientName).toHaveTextContent('John Doe');
  });

  it('should correctly identify VIP clients', () => {
    renderWithProviders(<TestComponent client={mockVipClient} />);
    
    const vipStatus = screen.getByTestId('vip-status');
    expect(vipStatus).toHaveTextContent('VIP');
  });

  it('should correctly identify regular clients', () => {
    renderWithProviders(<TestComponent client={mockRegularClient} />);
    
    const vipStatus = screen.getByTestId('vip-status');
    expect(vipStatus).toHaveTextContent('Regular');
  });

  it('should display correct badge text for VIP clients', () => {
    renderWithProviders(<TestComponent client={mockVipClient} />);
    
    const badgeText = screen.getByTestId('badge-text');
    expect(badgeText).toHaveTextContent('Gold');
  });

  it('should display correct badge text for regular clients', () => {
    renderWithProviders(<TestComponent client={mockRegularClient} />);
    
    const badgeText = screen.getByTestId('badge-text');
    expect(badgeText).toHaveTextContent('Regular');
  });
});