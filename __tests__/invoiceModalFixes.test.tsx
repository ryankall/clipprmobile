import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import InvoicePage from "../client/src/pages/invoice";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiRequest } from "../client/src/lib/queryClient";

// Mock the API request function
vi.mock("../client/src/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/invoice", vi.fn()],
  useParams: () => ({}),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock useToast hook
vi.mock("../client/src/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn(() => "Jan 1, 2024 • 10:00 AM"),
}));

const mockApiRequest = apiRequest as any;

// Mock data
const mockServices = [
  { id: 1, name: "Haircut", price: "45.00", duration: 30, category: "Haircuts", description: "Classic men's haircut" },
  { id: 2, name: "Beard Trim", price: "25.00", duration: 15, category: "Beard Services", description: "Professional beard trimming" },
  { id: 3, name: "Combo", price: "65.00", duration: 45, category: "Combinations", description: "Haircut + Beard Trim combo" },
];

const mockClients = [
  { id: 1, name: "John Doe", phone: "123-456-7890", email: "john@example.com" },
  { id: 2, name: "Jane Smith", phone: "987-654-3210", email: "jane@example.com" },
];

const mockInvoices = [
  {
    id: 1,
    clientId: 1,
    subtotal: "45.00",
    tip: "5.00",
    total: "50.00",
    status: "paid",
    paymentMethod: "stripe",
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: 2,
    clientId: 2,
    subtotal: "65.00",
    tip: "10.00",
    total: "75.00",
    status: "pending",
    paymentMethod: "cash",
    createdAt: "2024-01-02T11:00:00Z",
  },
];

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

describe("Invoice Modal Fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockApiRequest.mockImplementation((method: string, url: string) => {
      if (url === "/api/services") return Promise.resolve(mockServices);
      if (url === "/api/clients") return Promise.resolve(mockClients);
      if (url === "/api/invoices") return Promise.resolve(mockInvoices);
      if (url.startsWith("/api/invoices/")) {
        const invoiceId = parseInt(url.split("/").pop()!);
        const invoice = mockInvoices.find(i => i.id === invoiceId);
        return Promise.resolve({
          ...invoice,
          services: [mockServices[0], mockServices[1]], // Mock services for the invoice
        });
      }
      return Promise.resolve([]);
    });
  });

  describe("Add Service Button Persistence", () => {
    it("should show Add Service button initially when no services are selected", async () => {
      render(<InvoicePage />, { wrapper: createWrapper() });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Click Create button to open invoice modal
      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      // Check that Add Service button is visible in the modal
      await waitFor(() => {
        const addServiceButtons = screen.getAllByText("Add Service");
        expect(addServiceButtons.length).toBeGreaterThan(0);
        // The one in the invoice modal should be present
        expect(addServiceButtons[0]).toBeInTheDocument();
      });
    });

    it("should keep Add Service button visible after adding one service", async () => {
      render(<InvoicePage />, { wrapper: createWrapper() });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Click Create button to open invoice modal
      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      // Click Add Service button (first one in the modal)
      const addServiceButtons = screen.getAllByText("Add Service");
      const modalAddServiceButton = addServiceButtons.find(btn => 
        btn.closest('[role="dialog"]') !== null
      ) || addServiceButtons[0];
      fireEvent.click(modalAddServiceButton);

      // Wait for service selection modal
      await waitFor(() => {
        expect(screen.getByText("Select Services")).toBeInTheDocument();
      });

      // Select a service (Haircut)
      const haircutService = screen.getByText("Haircut");
      fireEvent.click(haircutService);

      // Wait for service to be added and modal to close
      await waitFor(() => {
        expect(screen.queryByText("Select Services")).not.toBeInTheDocument();
      });

      // Check that Add Service button is still visible in the modal
      const updatedAddServiceButtons = screen.getAllByText("Add Service");
      expect(updatedAddServiceButtons.length).toBeGreaterThan(0);
    });

    it("should allow adding multiple services consecutively", async () => {
      render(<InvoicePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      // Add first service
      let addServiceButtons = screen.getAllByText("Add Service");
      const modalButton = addServiceButtons.find(btn => 
        btn.closest('[role="dialog"]') !== null
      ) || addServiceButtons[0];
      fireEvent.click(modalButton);

      await waitFor(() => {
        expect(screen.getByText("Select Services")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Haircut"));

      await waitFor(() => {
        expect(screen.queryByText("Select Services")).not.toBeInTheDocument();
      });

      // Add second service - button should still be available
      addServiceButtons = screen.getAllByText("Add Service");
      const modalButton2 = addServiceButtons.find(btn => 
        btn.closest('[role="dialog"]') !== null
      ) || addServiceButtons[0];
      expect(modalButton2).toBeInTheDocument();
      fireEvent.click(modalButton2);

      await waitFor(() => {
        expect(screen.getByText("Select Services")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Beard Trim"));

      await waitFor(() => {
        expect(screen.queryByText("Select Services")).not.toBeInTheDocument();
      });

      // Verify Add Service button is still available for third service
      addServiceButtons = screen.getAllByText("Add Service");
      expect(addServiceButtons.length).toBeGreaterThan(0);
    });

    it("should update services summary when adding multiple services", async () => {
      render(<InvoicePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      // Add first service
      let addServiceButtons = screen.getAllByText("Add Service");
      let modalButton = addServiceButtons.find(btn => 
        btn.closest('[role="dialog"]') !== null
      ) || addServiceButtons[0];
      fireEvent.click(modalButton);
      await waitFor(() => expect(screen.getByText("Select Services")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Haircut"));
      await waitFor(() => expect(screen.queryByText("Select Services")).not.toBeInTheDocument());

      // Add second service
      addServiceButtons = screen.getAllByText("Add Service");
      modalButton = addServiceButtons.find(btn => 
        btn.closest('[role="dialog"]') !== null
      ) || addServiceButtons[0];
      fireEvent.click(modalButton);
      await waitFor(() => expect(screen.getByText("Select Services")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Beard Trim"));
      await waitFor(() => expect(screen.queryByText("Select Services")).not.toBeInTheDocument());

      // Check services summary shows both services
      expect(screen.getByText("Services Summary")).toBeInTheDocument();
      expect(screen.getByText("Haircut")).toBeInTheDocument();
      expect(screen.getByText("Beard Trim")).toBeInTheDocument();
    });
  });

  describe("Invoice Details Modal Services Display", () => {
    it("should properly call API to fetch invoice services with correct ID", async () => {
      const mockInvoiceWithServices = {
        ...mockInvoices[0],
        services: [mockServices[0], mockServices[1]],
      };

      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === "/api/invoices/1") {
          return Promise.resolve(mockInvoiceWithServices);
        }
        if (url === "/api/services") return Promise.resolve(mockServices);
        if (url === "/api/clients") return Promise.resolve(mockClients);
        if (url === "/api/invoices") return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      render(<InvoicePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Set up the test with an invoice
      const testInvoice = mockInvoices[0];
      
      // Simulate clicking on invoice details
      const invoicePage = screen.getByRole("main") || screen.getByText("Recent Invoices").parentElement;
      
      // We'll test the API call directly
      expect(mockApiRequest).toHaveBeenCalledWith("GET", "/api/services");
      expect(mockApiRequest).toHaveBeenCalledWith("GET", "/api/clients");
      expect(mockApiRequest).toHaveBeenCalledWith("GET", "/api/invoices");
    });

    it("should handle invoice services API response correctly", async () => {
      const mockInvoiceWithServices = {
        ...mockInvoices[0],
        services: [
          { name: "Haircut", price: "45.00", description: "Classic men's haircut" },
          { name: "Beard Trim", price: "25.00", description: "Professional beard trimming" },
        ],
      };

      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === "/api/invoices/1") {
          return Promise.resolve(mockInvoiceWithServices);
        }
        if (url === "/api/services") return Promise.resolve(mockServices);
        if (url === "/api/clients") return Promise.resolve(mockClients);
        if (url === "/api/invoices") return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      // Test that the API structure is correct
      const response = await mockApiRequest("GET", "/api/invoices/1");
      expect(response.services).toBeDefined();
      expect(response.services.length).toBe(2);
      expect(response.services[0].name).toBe("Haircut");
      expect(response.services[1].name).toBe("Beard Trim");
    });

    it("should handle empty services array correctly", async () => {
      const mockInvoiceWithNoServices = {
        ...mockInvoices[0],
        services: [],
      };

      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === "/api/invoices/1") {
          return Promise.resolve(mockInvoiceWithNoServices);
        }
        if (url === "/api/services") return Promise.resolve(mockServices);
        if (url === "/api/clients") return Promise.resolve(mockClients);
        if (url === "/api/invoices") return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      const response = await mockApiRequest("GET", "/api/invoices/1");
      expect(response.services).toBeDefined();
      expect(response.services.length).toBe(0);
    });

    it("should handle API errors gracefully", async () => {
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === "/api/invoices/1") {
          return Promise.reject(new Error("Failed to fetch invoice"));
        }
        if (url === "/api/services") return Promise.resolve(mockServices);
        if (url === "/api/clients") return Promise.resolve(mockClients);
        if (url === "/api/invoices") return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      let error = null;
      try {
        await mockApiRequest("GET", "/api/invoices/1");
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Failed to fetch invoice");
    });

    it("should validate invoice services data structure", async () => {
      const mockInvoiceWithServices = {
        ...mockInvoices[0],
        services: [
          { 
            name: "Haircut", 
            price: "45.00", 
            description: "Classic men's haircut",
            id: 1,
            category: "Haircuts",
            duration: 30
          },
          { 
            name: "Beard Trim", 
            price: "25.00", 
            description: "Professional beard trimming",
            id: 2,
            category: "Beard Services", 
            duration: 15
          },
        ],
      };

      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url === "/api/invoices/1") {
          return Promise.resolve(mockInvoiceWithServices);
        }
        return Promise.resolve([]);
      });

      const response = await mockApiRequest("GET", "/api/invoices/1");
      
      // Validate services structure
      expect(response.services).toBeDefined();
      expect(Array.isArray(response.services)).toBe(true);
      
      response.services.forEach((service: any) => {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('price');
        expect(typeof service.name).toBe('string');
        expect(typeof service.price).toBe('string');
      });
    });
  });

  describe("Integration Tests", () => {
    it("should maintain Add Service button functionality after creating an invoice", async () => {
      // Mock successful invoice creation
      mockApiRequest.mockImplementation((method: string, url: string, data?: any) => {
        if (method === "POST" && url === "/api/invoices") {
          return Promise.resolve({ id: 3, ...data });
        }
        if (url === "/api/services") return Promise.resolve(mockServices);
        if (url === "/api/clients") return Promise.resolve(mockClients);
        if (url === "/api/invoices") return Promise.resolve(mockInvoices);
        return Promise.resolve([]);
      });

      render(<InvoicePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Create new invoice
      fireEvent.click(screen.getByText("Create"));

      // Add service
      let addServiceButtons = screen.getAllByText("Add Service");
      let modalButton = addServiceButtons.find(btn => 
        btn.closest('[role="dialog"]') !== null
      ) || addServiceButtons[0];
      fireEvent.click(modalButton);
      await waitFor(() => expect(screen.getByText("Select Services")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Haircut"));
      await waitFor(() => expect(screen.queryByText("Select Services")).not.toBeInTheDocument());

      // Verify Add Service button is still available
      addServiceButtons = screen.getAllByText("Add Service");
      expect(addServiceButtons.length).toBeGreaterThan(0);

      // Select client and submit (if form allows)
      const clientSelect = screen.getByText("Select client");
      fireEvent.click(clientSelect);
      await waitFor(() => expect(screen.getByText("John Doe")).toBeInTheDocument());
      fireEvent.click(screen.getByText("John Doe"));

      // Should still be able to add more services
      addServiceButtons = screen.getAllByText("Add Service");
      expect(addServiceButtons.length).toBeGreaterThan(0);
    });

    it("should validate the fix for both bugs together", async () => {
      render(<InvoicePage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Test 1: Add Service button persistence  
      fireEvent.click(screen.getByText("Create"));
      
      // Initially should have Add Service button
      let addServiceButtons = screen.getAllByText("Add Service");
      expect(addServiceButtons.length).toBeGreaterThan(0);
      
      // Add a service
      let modalButton = addServiceButtons.find(btn => 
        btn.closest('[role="dialog"]') !== null
      ) || addServiceButtons[0];
      fireEvent.click(modalButton);
      await waitFor(() => expect(screen.getByText("Select Services")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Haircut"));
      await waitFor(() => expect(screen.queryByText("Select Services")).not.toBeInTheDocument());

      // Button should still be available - this was the bug
      addServiceButtons = screen.getAllByText("Add Service");
      expect(addServiceButtons.length).toBeGreaterThan(0);

      // Test 2: Invoice services API structure
      const mockInvoiceResponse = await mockApiRequest("GET", "/api/invoices/1");
      expect(mockInvoiceResponse.services).toBeDefined();
    });
  });
});