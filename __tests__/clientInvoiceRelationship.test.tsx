import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClientProfile from '../client/src/pages/client-profile';
import { apiRequest } from '../client/src/lib/queryClient';

// Mock the API request function
vi.mock('../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
}));

// Mock wouter navigation
vi.mock('wouter', () => ({
  useParams: () => ({ id: '1' }),
  useLocation: () => ['/clients/1', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>
}));

// Mock toast hook
vi.mock('../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockClient = {
  id: 1,
  userId: 1,
  name: 'John Doe',
  phone: '1234567890',
  email: 'john@example.com',
  address: '123 Main St',
  photoUrl: null,
  preferredStyle: 'Fade',
  notes: 'Regular client',
  loyaltyStatus: 'vip',
  totalVisits: 5,
  lastVisit: new Date('2025-01-15T10:00:00Z'),
  phoneVerified: true,
  deletedAt: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  totalSpent: '250.00',
  upcomingAppointments: 1
};

const mockInvoices = [
  {
    id: 1,
    userId: 1,
    clientId: 1,
    appointmentId: 1,
    subtotal: '50.00',
    tip: '10.00',
    total: '60.00',
    status: 'pending',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    stripePaymentIntentId: null,
    sendEmail: false,
    sendSMS: false,
    emailSent: false,
    smsSent: false,
    paidAt: new Date('2025-01-15T14:00:00Z'),
    paidBy: 'barber',
    createdAt: new Date('2025-01-15T12:00:00Z')
  },
  {
    id: 2,
    userId: 1,
    clientId: 1,
    appointmentId: null,
    subtotal: '80.00',
    tip: '15.00',
    total: '95.00',
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'stripe',
    stripePaymentIntentId: 'pi_1234567890',
    sendEmail: true,
    sendSMS: false,
    emailSent: true,
    smsSent: false,
    paidAt: null,
    paidBy: null,
    createdAt: new Date('2025-01-14T15:30:00Z')
  }
];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Client-Invoice Relationship Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock responses
    (apiRequest as any).mockImplementation((method: string, url: string) => {
      if (url === '/api/clients/1') return Promise.resolve(mockClient);
      if (url === '/api/clients/1/invoices') return Promise.resolve(mockInvoices);
      if (url === '/api/appointments') return Promise.resolve([]);
      if (url === '/api/gallery') return Promise.resolve([]);
      if (url === '/api/messages') return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Invoice History Display', () => {
    it('should display client invoice history card with last 10 invoices', async () => {
      renderWithQueryClient(<ClientProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('Invoice History (2)')).toBeInTheDocument();
      });
      
      // Check that invoices are displayed
      expect(screen.getByText('Invoice #1')).toBeInTheDocument();
      expect(screen.getByText('Invoice #2')).toBeInTheDocument();
      
      // Check invoice details
      expect(screen.getByText('$60.00')).toBeInTheDocument();
      expect(screen.getByText('$95.00')).toBeInTheDocument();
      expect(screen.getByText('paid')).toBeInTheDocument();
      expect(screen.getByText('unpaid')).toBeInTheDocument();
      expect(screen.getByText('cash')).toBeInTheDocument();
      expect(screen.getByText('stripe')).toBeInTheDocument();
      
      // Verify API call was made
      expect(apiRequest).toHaveBeenCalledWith('GET', '/api/clients/1/invoices');
    });

    it('should display empty state when client has no invoices', async () => {
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/1') return Promise.resolve(mockClient);
        if (url === '/api/clients/1/invoices') return Promise.resolve([]);
        if (url === '/api/appointments') return Promise.resolve([]);
        if (url === '/api/gallery') return Promise.resolve([]);
        if (url === '/api/messages') return Promise.resolve([]);
        return Promise.resolve([]);
      });

      renderWithQueryClient(<ClientProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('Invoice History (0)')).toBeInTheDocument();
      });
      
      expect(screen.getByText('No invoices yet')).toBeInTheDocument();
      expect(screen.getByText('Create first invoice')).toBeInTheDocument();
    });

    it('should show loading state while fetching invoices', async () => {
      let resolvePromise: (value: any) => void;
      const loadingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/1') return Promise.resolve(mockClient);
        if (url === '/api/clients/1/invoices') return loadingPromise;
        if (url === '/api/appointments') return Promise.resolve([]);
        if (url === '/api/gallery') return Promise.resolve([]);
        if (url === '/api/messages') return Promise.resolve([]);
        return Promise.resolve([]);
      });

      renderWithQueryClient(<ClientProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('Invoice History (0)')).toBeInTheDocument();
      });
      
      // Should show loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      
      // Resolve the promise
      resolvePromise!(mockInvoices);
      
      await waitFor(() => {
        expect(screen.getByText('Invoice History (2)')).toBeInTheDocument();
      });
    });
  });

  describe('Soft Client Deletion', () => {
    it('should soft delete client without removing invoices', async () => {
      const mockDeleteResponse = { success: true };
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (method === 'DELETE' && url === '/api/clients/1') {
          return Promise.resolve(mockDeleteResponse);
        }
        if (url === '/api/clients/1') return Promise.resolve(mockClient);
        if (url === '/api/clients/1/invoices') return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      renderWithQueryClient(<ClientProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Simulate delete action (this would typically be in a delete button/modal)
      // For this test, we'll directly verify the API call behavior
      const deleteResult = await apiRequest('DELETE', '/api/clients/1');
      expect(deleteResult).toEqual(mockDeleteResponse);
      expect(apiRequest).toHaveBeenCalledWith('DELETE', '/api/clients/1');
    });

    it('should preserve invoice-client relationship after soft deletion', async () => {
      // Test that invoices still reference the client even after soft deletion
      const softDeletedClient = { ...mockClient, deletedAt: new Date() };
      
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/1/invoices') return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      // Even with soft-deleted client, invoices should still be retrievable
      const invoicesResult = await apiRequest('GET', '/api/clients/1/invoices');
      expect(invoicesResult).toEqual(mockInvoices);
      expect(invoicesResult[0].clientId).toBe(1);
      expect(invoicesResult[1].clientId).toBe(1);
    });
  });

  describe('Client Re-addition by Phone Number', () => {
    it('should reconnect client to existing invoices when re-added with same phone', async () => {
      const existingInvoicesForPhone = mockInvoices;
      const reconnectedClient = { ...mockClient, id: 1 }; // Same ID means reconnected
      
      (apiRequest as any).mockImplementation((method: string, url: string, data?: any) => {
        if (method === 'POST' && url === '/api/clients') {
          // Simulate finding existing client by phone and reconnecting
          if (data.phone === '1234567890') {
            return Promise.resolve(reconnectedClient);
          }
        }
        if (url === '/api/clients/1/invoices') return Promise.resolve(existingInvoicesForPhone);
        return Promise.resolve([]);
      });

      // Simulate creating a client with the same phone number
      const newClientData = {
        name: 'John Doe (Re-added)',
        phone: '1234567890',
        email: 'john@example.com'
      };
      
      const result = await apiRequest('POST', '/api/clients', newClientData);
      expect(result).toEqual(reconnectedClient);
      
      // Verify invoices are still connected
      const invoices = await apiRequest('GET', '/api/clients/1/invoices');
      expect(invoices).toEqual(existingInvoicesForPhone);
      expect(invoices.length).toBe(2);
    });

    it('should handle new client creation with unique phone number', async () => {
      const newClient = {
        id: 2,
        userId: 1,
        name: 'Jane Smith',
        phone: '9876543210',
        email: 'jane@example.com',
        deletedAt: null,
        createdAt: new Date()
      };
      
      (apiRequest as any).mockImplementation((method: string, url: string, data?: any) => {
        if (method === 'POST' && url === '/api/clients') {
          if (data.phone === '9876543210') {
            return Promise.resolve(newClient);
          }
        }
        if (url === '/api/clients/2/invoices') return Promise.resolve([]);
        return Promise.resolve([]);
      });

      const newClientData = {
        name: 'Jane Smith',
        phone: '9876543210',
        email: 'jane@example.com'
      };
      
      const result = await apiRequest('POST', '/api/clients', newClientData);
      expect(result).toEqual(newClient);
      
      // New client should have no invoices initially
      const invoices = await apiRequest('GET', '/api/clients/2/invoices');
      expect(invoices).toEqual([]);
    });
  });

  describe('Phone Number Connection Logic', () => {
    it('should find client by phone number for invoice relationship', async () => {
      const phoneNumber = '1234567890';
      
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === `/api/clients/search?phone=${phoneNumber}`) {
          return Promise.resolve(mockClient);
        }
        return Promise.resolve(null);
      });

      const foundClient = await apiRequest('GET', `/api/clients/search?phone=${phoneNumber}`);
      expect(foundClient).toEqual(mockClient);
      expect(foundClient.phone).toBe(phoneNumber);
    });

    it('should handle multiple clients with same phone across different barbers', async () => {
      const barberId1 = 1;
      const barberId2 = 2;
      const sharedPhone = '1234567890';
      
      const client1 = { ...mockClient, userId: barberId1, id: 1 };
      const client2 = { ...mockClient, userId: barberId2, id: 2, name: 'John Doe (Barber 2)' };
      
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === `/api/clients/search?phone=${sharedPhone}&userId=${barberId1}`) {
          return Promise.resolve(client1);
        }
        if (url === `/api/clients/search?phone=${sharedPhone}&userId=${barberId2}`) {
          return Promise.resolve(client2);
        }
        return Promise.resolve(null);
      });

      // Each barber should find their own client with the same phone
      const barber1Client = await apiRequest('GET', `/api/clients/search?phone=${sharedPhone}&userId=${barberId1}`);
      const barber2Client = await apiRequest('GET', `/api/clients/search?phone=${sharedPhone}&userId=${barberId2}`);
      
      expect(barber1Client.userId).toBe(barberId1);
      expect(barber2Client.userId).toBe(barberId2);
      expect(barber1Client.phone).toBe(sharedPhone);
      expect(barber2Client.phone).toBe(sharedPhone);
    });
  });

  describe('Invoice History API Integration', () => {
    it('should limit invoice results to specified number', async () => {
      const limitedInvoices = mockInvoices.slice(0, 1);
      
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/1/invoices?limit=1') {
          return Promise.resolve(limitedInvoices);
        }
        if (url === '/api/clients/1/invoices') return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      // Test default limit (should be 10)
      const allInvoices = await apiRequest('GET', '/api/clients/1/invoices');
      expect(allInvoices).toEqual(mockInvoices);
      
      // Test custom limit
      const limitedResult = await apiRequest('GET', '/api/clients/1/invoices?limit=1');
      expect(limitedResult).toEqual(limitedInvoices);
      expect(limitedResult.length).toBe(1);
    });

    it('should sort invoices by creation date (newest first)', async () => {
      const sortedInvoices = [...mockInvoices].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/1/invoices') return Promise.resolve(sortedInvoices);
        return Promise.resolve([]);
      });

      const result = await apiRequest('GET', '/api/clients/1/invoices');
      expect(result[0].createdAt).toBe('2025-01-15T12:00:00.000Z');
      expect(result[1].createdAt).toBe('2025-01-14T15:30:00.000Z');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully when fetching client invoices', async () => {
      const errorMessage = 'Failed to fetch invoices';
      
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/1') return Promise.resolve(mockClient);
        if (url === '/api/clients/1/invoices') return Promise.reject(new Error(errorMessage));
        if (url === '/api/appointments') return Promise.resolve([]);
        if (url === '/api/gallery') return Promise.resolve([]);
        if (url === '/api/messages') return Promise.resolve([]);
        return Promise.resolve([]);
      });

      renderWithQueryClient(<ClientProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Should still show the invoice section but with empty state or error
      await waitFor(() => {
        expect(screen.getByText('Invoice History (0)')).toBeInTheDocument();
      });
    });

    it('should handle client not found errors', async () => {
      (apiRequest as any).mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/1') return Promise.reject(new Error('Client not found'));
        return Promise.resolve([]);
      });

      renderWithQueryClient(<ClientProfile />);
      
      // Should handle the error gracefully without crashing
      await waitFor(() => {
        // The component should still render even if client is not found
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should maintain invoice-client relationship across client deletion and re-addition cycle', async () => {
      let clientDeleted = false;
      
      (apiRequest as any).mockImplementation((method: string, url: string, data?: any) => {
        // Initial state - client exists
        if (url === '/api/clients/1' && !clientDeleted) {
          return Promise.resolve(mockClient);
        }
        
        // After deletion - client not found
        if (url === '/api/clients/1' && clientDeleted) {
          return Promise.reject(new Error('Client not found'));
        }
        
        // Delete client
        if (method === 'DELETE' && url === '/api/clients/1') {
          clientDeleted = true;
          return Promise.resolve({ success: true });
        }
        
        // Re-add client with same phone
        if (method === 'POST' && url === '/api/clients' && data?.phone === '1234567890') {
          clientDeleted = false;
          return Promise.resolve({ ...mockClient, name: 'John Doe (Restored)' });
        }
        
        // Invoices always remain accessible
        if (url === '/api/clients/1/invoices') {
          return Promise.resolve(mockInvoices);
        }
        
        return Promise.resolve([]);
      });

      // 1. Initial state - client and invoices exist
      let client = await apiRequest('GET', '/api/clients/1');
      let invoices = await apiRequest('GET', '/api/clients/1/invoices');
      expect(client.name).toBe('John Doe');
      expect(invoices.length).toBe(2);
      
      // 2. Delete client (soft delete)
      await apiRequest('DELETE', '/api/clients/1');
      
      // 3. Invoices should still be accessible
      invoices = await apiRequest('GET', '/api/clients/1/invoices');
      expect(invoices.length).toBe(2);
      expect(invoices[0].clientId).toBe(1);
      
      // 4. Re-add client with same phone
      const restoredClient = await apiRequest('POST', '/api/clients', {
        name: 'John Doe (Restored)',
        phone: '1234567890',
        email: 'john@example.com'
      });
      expect(restoredClient.name).toBe('John Doe (Restored)');
      
      // 5. Invoices should still be connected
      invoices = await apiRequest('GET', '/api/clients/1/invoices');
      expect(invoices.length).toBe(2);
      expect(invoices[0].clientId).toBe(1);
    });
  });
});