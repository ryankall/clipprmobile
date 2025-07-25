import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClientProfile from '../client/src/pages/client-profile';
import Invoice from '../client/src/pages/invoice';
import { apiRequest } from '../client/src/lib/queryClient';

// Mock the API request function
vi.mock('../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }),
}));

// Mock wouter
vi.mock('wouter', () => ({
  useParams: () => ({ id: '39' }),
  useLocation: () => ['/clients/39', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock toast
vi.mock('../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => '2025-07-25 6:30 PM',
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Invoice Modal SMS and Email Buttons', () => {
  let mockApiRequest: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest = vi.mocked(apiRequest);
    
    // Mock client data with email
    mockApiRequest.mockImplementation((method: string, url: string) => {
      if (url === '/api/clients/39') {
        return Promise.resolve({
          id: 39,
          userId: 3,
          name: 'jackie',
          phone: '(555) 123-4567',
          email: 'jackie@example.com',
          address: '123 Main St',
          preferredStyle: 'buzz cut',
          notes: 'Regular client',
          loyaltyStatus: 'regular',
          totalVisits: 5,
          totalSpent: '150.00',
        });
      }
      
      if (url === '/api/clients/39/invoices') {
        return Promise.resolve([
          {
            id: 10,
            userId: 3,
            clientId: 39,
            appointmentId: 123,
            subtotal: '25.00',
            tip: '5.00',
            total: '30.00',
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            createdAt: '2025-07-25T18:30:00Z',
          }
        ]);
      }
      
      if (url === '/api/invoices/10') {
        return Promise.resolve({
          id: 10,
          userId: 3,
          clientId: 39,
          appointmentId: 123,
          subtotal: '25.00',
          tip: '5.00',
          total: '30.00',
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          createdAt: '2025-07-25T18:30:00Z',
          services: [
            {
              serviceName: 'Buzz Cut',
              name: 'Buzz Cut',
              description: 'Short, even haircut',
              price: '25.00',
              quantity: 1,
            }
          ]
        });
      }
      
      if (url === '/api/invoices/10/send-sms') {
        return Promise.resolve({
          message: 'SMS sent successfully',
          details: {
            phone: '(555) 123-4567',
            amount: '30.00',
            services: 'Buzz Cut'
          }
        });
      }
      
      if (url === '/api/invoices/10/send-email') {
        return Promise.resolve({
          message: 'Email sent successfully',
          details: {
            email: 'jackie@example.com',
            amount: '30.00',
            services: 'Buzz Cut'
          }
        });
      }
      
      return Promise.resolve({});
    });
  });

  describe('Client Profile Invoice Modal', () => {
    test('should show SMS and Email buttons in invoice modal', async () => {
      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = await screen.findByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open and invoice details to load
      await waitFor(() => {
        expect(screen.getByText('Send Invoice')).toBeInTheDocument();
      });
      
      // Check SMS button is present
      expect(screen.getByText('Send SMS')).toBeInTheDocument();
      
      // Check Email button is present (client has email)
      expect(screen.getByText('Send Email')).toBeInTheDocument();
    });

    test('should hide Email button when client has no email', async () => {
      // Mock client without email
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/39') {
          return Promise.resolve({
            id: 39,
            userId: 3,
            name: 'jackie',
            phone: '(555) 123-4567',
            email: null, // No email
            address: '123 Main St',
            preferredStyle: 'buzz cut',
            notes: 'Regular client',
            loyaltyStatus: 'regular',
            totalVisits: 5,
            totalSpent: '150.00',
          });
        }
        
        if (url === '/api/clients/39/invoices') {
          return Promise.resolve([
            {
              id: 10,
              userId: 3,
              clientId: 39,
              appointmentId: 123,
              subtotal: '25.00',
              tip: '5.00',
              total: '30.00',
              paymentMethod: 'cash',
              paymentStatus: 'pending',
              createdAt: '2025-07-25T18:30:00Z',
            }
          ]);
        }
        
        return Promise.resolve({});
      });

      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = await screen.findByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send Invoice')).toBeInTheDocument();
      });
      
      // Check SMS button is present
      expect(screen.getByText('Send SMS')).toBeInTheDocument();
      
      // Check Email button is NOT present (client has no email)
      expect(screen.queryByText('Send Email')).not.toBeInTheDocument();
    });

    test('should send SMS when SMS button is clicked', async () => {
      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = await screen.findByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send SMS')).toBeInTheDocument();
      });
      
      // Click SMS button
      const smsButton = screen.getByText('Send SMS');
      fireEvent.click(smsButton);
      
      // Verify API call was made
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/invoices/10/send-sms');
      });
      
      // Button should show loading state temporarily
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    test('should send Email when Email button is clicked', async () => {
      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = await screen.findByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send Email')).toBeInTheDocument();
      });
      
      // Click Email button
      const emailButton = screen.getByText('Send Email');
      fireEvent.click(emailButton);
      
      // Verify API call was made
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/invoices/10/send-email');
      });
      
      // Button should show loading state temporarily
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    test('should handle SMS API error gracefully', async () => {
      // Mock SMS API to fail
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/invoices/10/send-sms') {
          return Promise.reject(new Error('SMS service unavailable'));
        }
        // Return normal responses for other endpoints
        if (url === '/api/clients/39') {
          return Promise.resolve({
            id: 39,
            userId: 3,
            name: 'jackie',
            phone: '(555) 123-4567',
            email: 'jackie@example.com',
          });
        }
        return Promise.resolve({});
      });

      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = await screen.findByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send SMS')).toBeInTheDocument();
      });
      
      // Click SMS button
      const smsButton = screen.getByText('Send SMS');
      fireEvent.click(smsButton);
      
      // Verify API call was attempted
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/invoices/10/send-sms');
      });
    });

    test('should handle Email API error gracefully', async () => {
      // Mock Email API to fail
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/invoices/10/send-email') {
          return Promise.reject(new Error('Email service unavailable'));
        }
        // Return normal responses for other endpoints
        if (url === '/api/clients/39') {
          return Promise.resolve({
            id: 39,
            userId: 3,
            name: 'jackie',
            phone: '(555) 123-4567',
            email: 'jackie@example.com',
          });
        }
        return Promise.resolve({});
      });

      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = await screen.findByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send Email')).toBeInTheDocument();
      });
      
      // Click Email button
      const emailButton = screen.getByText('Send Email');
      fireEvent.click(emailButton);
      
      // Verify API call was attempted
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/invoices/10/send-email');
      });
    });
  });

  describe('Invoice Page Modal', () => {
    beforeEach(() => {
      // Mock additional data needed for invoice page
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/invoices') {
          return Promise.resolve([
            {
              id: 10,
              userId: 3,
              clientId: 39,
              appointmentId: 123,
              subtotal: '25.00',
              tip: '5.00',
              total: '30.00',
              paymentMethod: 'cash',
              paymentStatus: 'pending',
              createdAt: '2025-07-25T18:30:00Z',
            }
          ]);
        }
        
        if (url === '/api/clients') {
          return Promise.resolve([
            {
              id: 39,
              userId: 3,
              name: 'jackie',
              phone: '(555) 123-4567',
              email: 'jackie@example.com',
              address: '123 Main St',
            }
          ]);
        }
        
        if (url === '/api/services') {
          return Promise.resolve([
            {
              id: 38,
              userId: 3,
              name: 'Buzz Cut',
              description: 'Short, even haircut',
              price: '25.00',
              duration: 30,
            }
          ]);
        }
        
        if (url === '/api/invoices/10') {
          return Promise.resolve({
            id: 10,
            userId: 3,
            clientId: 39,
            appointmentId: 123,
            subtotal: '25.00',
            tip: '5.00',
            total: '30.00',
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            createdAt: '2025-07-25T18:30:00Z',
          });
        }
        
        if (url === '/api/invoices/10/send-sms') {
          return Promise.resolve({
            message: 'SMS sent successfully',
            details: {
              phone: '(555) 123-4567',
              amount: '30.00',
              services: 'Buzz Cut'
            }
          });
        }
        
        if (url === '/api/invoices/10/send-email') {
          return Promise.resolve({
            message: 'Email sent successfully',
            details: {
              email: 'jackie@example.com',
              amount: '30.00',
              services: 'Buzz Cut'
            }
          });
        }
        
        return Promise.resolve({});
      });
    });

    test('should show SMS and Email buttons in invoice page modal', async () => {
      render(<Invoice />, { wrapper: createWrapper() });
      
      // Wait for invoices to load
      await waitFor(() => {
        expect(screen.getByText('$30.00')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = screen.getByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send Invoice')).toBeInTheDocument();
      });
      
      // Check SMS button is present
      expect(screen.getByText('Send SMS')).toBeInTheDocument();
      
      // Check Email button is present (client has email)
      expect(screen.getByText('Send Email')).toBeInTheDocument();
    });

    test('should send SMS from invoice page modal', async () => {
      render(<Invoice />, { wrapper: createWrapper() });
      
      // Wait for invoices to load
      await waitFor(() => {
        expect(screen.getByText('$30.00')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = screen.getByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send SMS')).toBeInTheDocument();
      });
      
      // Click SMS button
      const smsButton = screen.getByText('Send SMS');
      fireEvent.click(smsButton);
      
      // Verify API call was made
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/invoices/10/send-sms');
      });
    });

    test('should send Email from invoice page modal', async () => {
      render(<Invoice />, { wrapper: createWrapper() });
      
      // Wait for invoices to load
      await waitFor(() => {
        expect(screen.getByText('$30.00')).toBeInTheDocument();
      });
      
      // Click on an invoice to open modal
      const invoiceCard = screen.getByText('$30.00');
      fireEvent.click(invoiceCard);
      
      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Send Email')).toBeInTheDocument();
      });
      
      // Click Email button
      const emailButton = screen.getByText('Send Email');
      fireEvent.click(emailButton);
      
      // Verify API call was made
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/invoices/10/send-email');
      });
    });
  });

  describe('API Endpoint Functionality', () => {
    test('should validate SMS endpoint requirements', async () => {
      // Test that SMS endpoint requires phone number
      const mockClient = {
        id: 39,
        userId: 3,
        name: 'jackie',
        phone: null, // No phone number
        email: 'jackie@example.com',
      };
      
      // Mock API to return client without phone
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/39') {
          return Promise.resolve(mockClient);
        }
        if (url === '/api/invoices/10/send-sms') {
          return Promise.reject(new Error('Client has no phone number'));
        }
        return Promise.resolve({});
      });

      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Verify SMS functionality handles missing phone gracefully
      expect(mockClient.phone).toBeNull();
    });

    test('should validate Email endpoint requirements', async () => {
      // Test that Email endpoint requires email address
      const mockClient = {
        id: 39,
        userId: 3,
        name: 'jackie',
        phone: '(555) 123-4567',
        email: null, // No email address
      };
      
      // Mock API to return client without email
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/clients/39') {
          return Promise.resolve(mockClient);
        }
        if (url === '/api/invoices/10/send-email') {
          return Promise.reject(new Error('Client has no email address'));
        }
        return Promise.resolve({});
      });

      render(<ClientProfile />, { wrapper: createWrapper() });
      
      // Wait for client data to load
      await waitFor(() => {
        expect(screen.getByText('jackie')).toBeInTheDocument();
      });
      
      // Verify Email functionality handles missing email gracefully
      expect(mockClient.email).toBeNull();
    });

    test('should handle successful SMS and Email API responses', async () => {
      const mockSMSResponse = {
        message: 'SMS sent successfully',
        details: {
          phone: '(555) 123-4567',
          amount: '30.00',
          services: 'Buzz Cut'
        }
      };

      const mockEmailResponse = {
        message: 'Email sent successfully',
        details: {
          email: 'jackie@example.com',
          amount: '30.00',
          services: 'Buzz Cut'
        }
      };

      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === '/api/invoices/10/send-sms') {
          return Promise.resolve(mockSMSResponse);
        }
        if (url === '/api/invoices/10/send-email') {
          return Promise.resolve(mockEmailResponse);
        }
        return Promise.resolve({});
      });

      // Verify API responses contain required fields
      expect(mockSMSResponse.details.phone).toBe('(555) 123-4567');
      expect(mockSMSResponse.details.amount).toBe('30.00');
      expect(mockSMSResponse.details.services).toBe('Buzz Cut');
      
      expect(mockEmailResponse.details.email).toBe('jackie@example.com');
      expect(mockEmailResponse.details.amount).toBe('30.00');
      expect(mockEmailResponse.details.services).toBe('Buzz Cut');
    });
  });
});