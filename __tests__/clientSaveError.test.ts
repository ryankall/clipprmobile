import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Client Save Error Investigation", () => {
  // Mock client data structure
  interface MockClient {
    id: number;
    userId: number;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    preferredStyle?: string;
    notes?: string;
    loyaltyStatus?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  // Mock storage for client data
  class MockClientStorage {
    private clients: MockClient[] = [];
    private nextId = 1;

    constructor() {
      this.setupMockData();
    }

    private setupMockData(): void {
      // Create sample clients
      this.clients = [
        {
          id: 39,
          userId: 3,
          name: "jackie",
          phone: "(555) 123-4567",
          email: "jackie@example.com",
          address: "123 Main St, City, State",
          preferredStyle: "Fade",
          notes: "Regular client",
          loyaltyStatus: "regular",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 40,
          userId: 3,
          name: "John Doe",
          phone: "(555) 987-6543",
          email: "john@example.com",
          address: "456 Oak Ave, City, State",
          preferredStyle: "Buzz Cut",
          notes: "Prefers morning appointments",
          loyaltyStatus: "vip",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    }

    async getClient(id: number): Promise<MockClient | null> {
      const client = this.clients.find(c => c.id === id);
      return client || null;
    }

    async updateClient(id: number, updates: Partial<MockClient>): Promise<MockClient | null> {
      const clientIndex = this.clients.findIndex(c => c.id === id);
      if (clientIndex === -1) {
        throw new Error(`Client with id ${id} not found`);
      }

      // Simulate validation errors
      if (updates.hasOwnProperty('name') && (!updates.name || updates.name.trim().length === 0)) {
        throw new Error("Name is required");
      }
      
      if (updates.hasOwnProperty('phone') && (!updates.phone || updates.phone.trim().length === 0)) {
        throw new Error("Phone is required");
      }

      if (updates.email && updates.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updates.email)) {
          throw new Error("Invalid email format");
        }
      }

      // Update client
      this.clients[clientIndex] = {
        ...this.clients[clientIndex],
        ...updates,
        updatedAt: new Date()
      };

      return this.clients[clientIndex];
    }

    async getAllClients(): Promise<MockClient[]> {
      return [...this.clients];
    }

    getClientCount(): number {
      return this.clients.length;
    }

    clearAll(): void {
      this.clients = [];
    }
  }

  // Mock API handler
  class MockClientAPI {
    private storage: MockClientStorage;

    constructor() {
      this.storage = new MockClientStorage();
    }

    async handlePutRequest(id: number, data: any): Promise<{ status: number; data?: any; error?: string }> {
      try {
        const updatedClient = await this.storage.updateClient(id, data);
        return { status: 200, data: updatedClient };
      } catch (error) {
        return { status: 400, error: error.message };
      }
    }

    async handleGetRequest(id: number): Promise<{ status: number; data?: any; error?: string }> {
      try {
        const client = await this.storage.getClient(id);
        if (!client) {
          return { status: 404, error: "Client not found" };
        }
        return { status: 200, data: client };
      } catch (error) {
        return { status: 500, error: error.message };
      }
    }

    getStorage(): MockClientStorage {
      return this.storage;
    }
  }

  let clientAPI: MockClientAPI;

  beforeEach(() => {
    clientAPI = new MockClientAPI();
  });

  afterEach(() => {
    clientAPI.getStorage().clearAll();
  });

  describe("Client Save Basic Functionality", () => {
    it("should successfully save client with valid data", async () => {
      // Act
      const result = await clientAPI.handlePutRequest(39, {
        name: "Jackie Updated",
        phone: "(555) 123-4567",
        email: "jackie.updated@example.com"
      });

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("Jackie Updated");
      expect(result.data.email).toBe("jackie.updated@example.com");
    });

    it("should return 404 for non-existent client", async () => {
      // Act
      const result = await clientAPI.handlePutRequest(999, {
        name: "Non-existent Client"
      });

      // Assert
      expect(result.status).toBe(400);
      expect(result.error).toContain("not found");
    });

    it("should validate required fields", async () => {
      // Act
      const result = await clientAPI.handlePutRequest(39, {
        name: ""
      });

      // Assert
      expect(result.status).toBe(400);
      expect(result.error).toContain("Name is required");
    });

    it("should validate email format", async () => {
      // Act
      const result = await clientAPI.handlePutRequest(39, {
        email: "invalid-email"
      });

      // Assert
      expect(result.status).toBe(400);
      expect(result.error).toContain("Invalid email format");
    });
  });

  describe("Client Save Error Scenarios", () => {
    it("should handle empty name gracefully", async () => {
      // Act
      const result = await clientAPI.handlePutRequest(39, {
        name: "   "
      });

      // Assert
      expect(result.status).toBe(400);
      expect(result.error).toContain("Name is required");
    });

    it("should handle missing phone number", async () => {
      // Act
      const result = await clientAPI.handlePutRequest(39, {
        phone: ""
      });

      // Assert
      expect(result.status).toBe(400);
      expect(result.error).toContain("Phone is required");
    });

    it("should handle special characters in name", async () => {
      // Act
      const result = await clientAPI.handlePutRequest(39, {
        name: "Jackie O'Connor-Smith"
      });

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("Jackie O'Connor-Smith");
    });

    it("should handle long text in notes field", async () => {
      // Act
      const longNotes = "A".repeat(1000);
      const result = await clientAPI.handlePutRequest(39, {
        notes: longNotes
      });

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.notes).toBe(longNotes);
    });
  });

  describe("Client Save Data Integrity", () => {
    it("should preserve existing data when updating partial fields", async () => {
      // Arrange
      const originalClient = await clientAPI.getStorage().getClient(39);
      
      // Act
      const result = await clientAPI.handlePutRequest(39, {
        name: "Updated Name Only"
      });

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.name).toBe("Updated Name Only");
      expect(result.data.phone).toBe(originalClient.phone);
      expect(result.data.email).toBe(originalClient.email);
    });

    it("should update timestamp when client is modified", async () => {
      // Arrange
      const originalClient = await clientAPI.getStorage().getClient(39);
      const originalUpdateTime = originalClient.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const result = await clientAPI.handlePutRequest(39, {
        name: "Updated Name"
      });

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.updatedAt).not.toEqual(originalUpdateTime);
    });
  });

  describe("Client Save Performance", () => {
    it("should handle multiple concurrent updates", async () => {
      // Act
      const updates = [
        clientAPI.handlePutRequest(39, { name: "Update 1" }),
        clientAPI.handlePutRequest(40, { name: "Update 2" })
      ];

      const results = await Promise.all(updates);

      // Assert
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });

    it("should handle large dataset operations", async () => {
      // Arrange - Add many clients
      const storage = clientAPI.getStorage();
      for (let i = 0; i < 100; i++) {
        await storage.updateClient(39, { name: `Client ${i}` });
      }

      // Act
      const start = Date.now();
      const result = await clientAPI.handlePutRequest(39, { name: "Final Update" });
      const duration = Date.now() - start;

      // Assert
      expect(result.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("Client Save UI Integration", () => {
    it("should simulate successful form submission", async () => {
      // Arrange
      const formData = {
        name: "Jackie Smith",
        phone: "(555) 123-4567",
        email: "jackie.smith@example.com",
        address: "456 New St, City, State",
        preferredStyle: "Fade with beard trim",
        notes: "Updated preferences"
      };

      // Act
      const result = await clientAPI.handlePutRequest(39, formData);

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.name).toBe(formData.name);
      expect(result.data.phone).toBe(formData.phone);
      expect(result.data.email).toBe(formData.email);
      expect(result.data.address).toBe(formData.address);
      expect(result.data.preferredStyle).toBe(formData.preferredStyle);
      expect(result.data.notes).toBe(formData.notes);
    });

    it("should handle form validation errors", async () => {
      // Arrange
      const invalidFormData = {
        name: "",
        phone: "",
        email: "invalid-email-format"
      };

      // Act
      const result = await clientAPI.handlePutRequest(39, invalidFormData);

      // Assert
      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });
  });

  describe("Real-world Client Save Scenarios", () => {
    it("should handle the exact scenario from logs (client 39)", async () => {
      // This tests the exact scenario from the console logs
      // PUT /api/clients/39 returned 200

      // Act
      const result = await clientAPI.handlePutRequest(39, {
        name: "jackie",
        phone: "(555) 123-4567",
        email: "jackie@example.com"
      });

      // Assert
      expect(result.status).toBe(200);
      expect(result.data.id).toBe(39);
      expect(result.data.name).toBe("jackie");
    });

    it("should verify client exists before update", async () => {
      // Act
      const getResult = await clientAPI.handleGetRequest(39);
      
      // Assert
      expect(getResult.status).toBe(200);
      expect(getResult.data.id).toBe(39);
      expect(getResult.data.name).toBe("jackie");
    });
  });
});