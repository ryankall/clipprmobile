import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mobile travel toggle interfaces
interface MobileTravelToggleState {
  isEnabled: boolean;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  estimatedTravelTime?: number;
  travelMode: 'driving' | 'walking' | 'transit';
  autoFillFromClient: boolean;
}

interface MobileClient {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  preferredTravelMode?: 'driving' | 'walking' | 'transit';
}

interface MobileBookingMessage {
  clientName: string;
  clientPhone: string;
  selectedDate: string;
  selectedTime: string;
  services: string[];
  message?: string;
  travel?: {
    required: boolean;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    estimatedTime?: number;
  };
}

interface MobileAppointmentForm {
  clientId: string;
  services: Array<{ serviceId: number; quantity: number }>;
  scheduledAt: string;
  notes: string;
  travel: MobileTravelToggleState;
}

// Mobile location service with React Native geolocation
class MobileLocationService {
  private mockCurrentLocation = {
    latitude: 40.7128,
    longitude: -74.0060,
  };

  async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve) => {
      // Simulate React Native geolocation
      setTimeout(() => {
        resolve(this.mockCurrentLocation);
      }, 100);
    });
  }

  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    // Mock geocoding results
    const mockResults: { [key: string]: { latitude: number; longitude: number } } = {
      '123 Main St, New York, NY': { latitude: 40.7580, longitude: -73.9855 },
      '456 Broadway, New York, NY': { latitude: 40.7589, longitude: -73.9851 },
      '789 Park Ave, New York, NY': { latitude: 40.7614, longitude: -73.9776 },
    };

    return mockResults[address] || { latitude: 40.7128, longitude: -74.0060 };
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    // Mock reverse geocoding
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  async calculateTravelTime(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<number> {
    // Mock travel time calculation
    const distance = Math.sqrt(
      Math.pow(to.latitude - from.latitude, 2) + Math.pow(to.longitude - from.longitude, 2)
    );

    const timeMultipliers = {
      driving: 5,
      walking: 20,
      transit: 15,
    };

    return Math.round(distance * timeMultipliers[mode] * 60); // Convert to minutes
  }
}

// Mobile travel toggle component logic
class MobileTravelToggleManager {
  private locationService: MobileLocationService;
  private clients: MobileClient[] = [];

  constructor() {
    this.locationService = new MobileLocationService();
    this.setupMockClients();
  }

  private setupMockClients(): void {
    this.clients = [
      {
        id: 1,
        name: 'John Doe',
        phone: '6467891234',
        email: 'john@example.com',
        address: '123 Main St, New York, NY',
        coordinates: { latitude: 40.7580, longitude: -73.9855 },
        preferredTravelMode: 'driving',
      },
      {
        id: 2,
        name: 'Jane Smith',
        phone: '6467895678',
        email: 'jane@example.com',
        address: '456 Broadway, New York, NY',
        coordinates: { latitude: 40.7589, longitude: -73.9851 },
        preferredTravelMode: 'walking',
      },
    ];
  }

  async toggleTravel(currentState: MobileTravelToggleState): Promise<MobileTravelToggleState> {
    const newState = { ...currentState, isEnabled: !currentState.isEnabled };

    if (newState.isEnabled) {
      // Get current location when enabling travel
      try {
        const currentLocation = await this.locationService.getCurrentLocation();
        newState.coordinates = currentLocation;
      } catch (error) {
        console.warn('Failed to get current location:', error);
      }
    } else {
      // Clear travel data when disabling
      newState.address = '';
      newState.coordinates = undefined;
      newState.estimatedTravelTime = undefined;
    }

    return newState;
  }

  async autoFillFromClient(clientId: number, currentState: MobileTravelToggleState): Promise<MobileTravelToggleState> {
    if (!currentState.isEnabled || !currentState.autoFillFromClient) {
      return currentState;
    }

    const client = this.clients.find(c => c.id === clientId);
    if (!client?.address) {
      return currentState;
    }

    const newState = { ...currentState };
    newState.address = client.address;
    newState.coordinates = client.coordinates;
    newState.travelMode = client.preferredTravelMode || 'driving';

    // Calculate travel time if we have coordinates
    if (newState.coordinates) {
      try {
        const currentLocation = await this.locationService.getCurrentLocation();
        const travelTime = await this.locationService.calculateTravelTime(
          currentLocation,
          newState.coordinates,
          newState.travelMode
        );
        newState.estimatedTravelTime = travelTime;
      } catch (error) {
        console.warn('Failed to calculate travel time:', error);
      }
    }

    return newState;
  }

  async updateAddress(address: string, currentState: MobileTravelToggleState): Promise<MobileTravelToggleState> {
    const newState = { ...currentState, address };

    if (address.trim()) {
      try {
        // Geocode the address
        const coordinates = await this.locationService.geocodeAddress(address);
        newState.coordinates = coordinates;

        // Calculate travel time
        const currentLocation = await this.locationService.getCurrentLocation();
        const travelTime = await this.locationService.calculateTravelTime(
          currentLocation,
          coordinates,
          newState.travelMode
        );
        newState.estimatedTravelTime = travelTime;
      } catch (error) {
        console.warn('Failed to geocode address:', error);
        newState.coordinates = undefined;
        newState.estimatedTravelTime = undefined;
      }
    } else {
      newState.coordinates = undefined;
      newState.estimatedTravelTime = undefined;
    }

    return newState;
  }

  async updateTravelMode(mode: 'driving' | 'walking' | 'transit', currentState: MobileTravelToggleState): Promise<MobileTravelToggleState> {
    const newState = { ...currentState, travelMode: mode };

    // Recalculate travel time with new mode
    if (newState.coordinates) {
      try {
        const currentLocation = await this.locationService.getCurrentLocation();
        const travelTime = await this.locationService.calculateTravelTime(
          currentLocation,
          newState.coordinates,
          mode
        );
        newState.estimatedTravelTime = travelTime;
      } catch (error) {
        console.warn('Failed to recalculate travel time:', error);
      }
    }

    return newState;
  }

  parseBookingMessage(message: string): MobileBookingMessage {
    // Mock message parsing for mobile
    const mockMessage: MobileBookingMessage = {
      clientName: 'John Doe',
      clientPhone: '6467891234',
      selectedDate: '2025-07-15',
      selectedTime: '10:00 AM',
      services: ['Haircut'],
      message: message,
    };

    // Parse travel information from message
    if (message.toLowerCase().includes('travel') || message.toLowerCase().includes('come to')) {
      const addressMatch = message.match(/at\s+(.+?)(?:\.|$)/i);
      mockMessage.travel = {
        required: true,
        address: addressMatch ? addressMatch[1].trim() : '123 Main St, New York, NY',
        coordinates: { latitude: 40.7580, longitude: -73.9855 },
        estimatedTime: 15,
      };
    }

    return mockMessage;
  }

  getClient(clientId: number): MobileClient | undefined {
    return this.clients.find(c => c.id === clientId);
  }

  getClients(): MobileClient[] {
    return this.clients;
  }
}

// Mock React Native components
const MockTravelToggle = ({ 
  isEnabled, 
  onToggle, 
  address, 
  onAddressChange, 
  estimatedTime,
  travelMode,
  onTravelModeChange,
}: {
  isEnabled: boolean;
  onToggle: () => void;
  address: string;
  onAddressChange: (address: string) => void;
  estimatedTime?: number;
  travelMode: 'driving' | 'walking' | 'transit';
  onTravelModeChange: (mode: 'driving' | 'walking' | 'transit') => void;
}) => {
  return (
    <div>
      <button testID="travel-toggle" onPress={onToggle}>
        {isEnabled ? 'Disable Travel' : 'Enable Travel'}
      </button>
      {isEnabled && (
        <div>
          <input
            testID="address-input"
            value={address}
            onChangeText={onAddressChange}
            placeholder="Enter address"
          />
          <select
            testID="travel-mode-select"
            value={travelMode}
            onValueChange={onTravelModeChange}
          >
            <option value="driving">Driving</option>
            <option value="walking">Walking</option>
            <option value="transit">Transit</option>
          </select>
          {estimatedTime && (
            <div testID="estimated-time">
              Estimated time: {estimatedTime} minutes
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Test wrapper for mobile components
const MobileTravelTestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Mobile Travel Toggle System', () => {
  let travelManager: MobileTravelToggleManager;
  let initialState: MobileTravelToggleState;

  beforeEach(() => {
    travelManager = new MobileTravelToggleManager();
    initialState = {
      isEnabled: false,
      address: '',
      travelMode: 'driving',
      autoFillFromClient: true,
    };
  });

  describe('Mobile Travel Toggle Basic Functionality', () => {
    it('should toggle travel state on mobile', async () => {
      const newState = await travelManager.toggleTravel(initialState);
      
      expect(newState.isEnabled).toBe(true);
      expect(newState.coordinates).toBeDefined();
      expect(newState.coordinates?.latitude).toBe(40.7128);
      expect(newState.coordinates?.longitude).toBe(-74.0060);
    });

    it('should clear travel data when disabling', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      enabledState.address = '123 Main St';
      enabledState.estimatedTravelTime = 15;
      
      const disabledState = await travelManager.toggleTravel(enabledState);
      
      expect(disabledState.isEnabled).toBe(false);
      expect(disabledState.address).toBe('');
      expect(disabledState.coordinates).toBeUndefined();
      expect(disabledState.estimatedTravelTime).toBeUndefined();
    });
  });

  describe('Mobile Client Auto-Fill', () => {
    it('should auto-fill address from client data', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      const autoFilledState = await travelManager.autoFillFromClient(1, enabledState);
      
      expect(autoFilledState.address).toBe('123 Main St, New York, NY');
      expect(autoFilledState.coordinates?.latitude).toBe(40.7580);
      expect(autoFilledState.coordinates?.longitude).toBe(-73.9855);
      expect(autoFilledState.travelMode).toBe('driving');
      expect(autoFilledState.estimatedTravelTime).toBeDefined();
    });

    it('should not auto-fill when travel is disabled', async () => {
      const state = await travelManager.autoFillFromClient(1, initialState);
      
      expect(state.address).toBe('');
      expect(state.coordinates).toBeUndefined();
    });

    it('should not auto-fill when autoFillFromClient is false', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      enabledState.autoFillFromClient = false;
      
      const state = await travelManager.autoFillFromClient(1, enabledState);
      
      expect(state.address).toBe('');
      expect(state.coordinates).toBeUndefined();
    });
  });

  describe('Mobile Address Handling', () => {
    it('should geocode address and calculate travel time', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      const updatedState = await travelManager.updateAddress('123 Main St, New York, NY', enabledState);
      
      expect(updatedState.address).toBe('123 Main St, New York, NY');
      expect(updatedState.coordinates?.latitude).toBe(40.7580);
      expect(updatedState.coordinates?.longitude).toBe(-73.9855);
      expect(updatedState.estimatedTravelTime).toBeDefined();
    });

    it('should clear coordinates when address is empty', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      enabledState.coordinates = { latitude: 40.7580, longitude: -73.9855 };
      enabledState.estimatedTravelTime = 15;
      
      const updatedState = await travelManager.updateAddress('', enabledState);
      
      expect(updatedState.address).toBe('');
      expect(updatedState.coordinates).toBeUndefined();
      expect(updatedState.estimatedTravelTime).toBeUndefined();
    });
  });

  describe('Mobile Travel Mode Selection', () => {
    it('should update travel mode and recalculate time', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      enabledState.address = '123 Main St, New York, NY';
      enabledState.coordinates = { latitude: 40.7580, longitude: -73.9855 };
      
      const walkingState = await travelManager.updateTravelMode('walking', enabledState);
      const drivingState = await travelManager.updateTravelMode('driving', enabledState);
      
      expect(walkingState.travelMode).toBe('walking');
      expect(drivingState.travelMode).toBe('driving');
      
      // Walking should take longer than driving
      expect(walkingState.estimatedTravelTime).toBeGreaterThan(drivingState.estimatedTravelTime!);
    });

    it('should handle transit mode correctly', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      enabledState.address = '123 Main St, New York, NY';
      enabledState.coordinates = { latitude: 40.7580, longitude: -73.9855 };
      
      const transitState = await travelManager.updateTravelMode('transit', enabledState);
      
      expect(transitState.travelMode).toBe('transit');
      expect(transitState.estimatedTravelTime).toBeDefined();
    });
  });

  describe('Mobile Message Parsing', () => {
    it('should parse travel information from booking message', () => {
      const message = 'Hi, I need a haircut at 123 Main St, New York, NY. Please come to my location.';
      const parsedMessage = travelManager.parseBookingMessage(message);
      
      expect(parsedMessage.travel?.required).toBe(true);
      expect(parsedMessage.travel?.address).toBe('123 Main St, New York, NY');
      expect(parsedMessage.travel?.coordinates).toBeDefined();
      expect(parsedMessage.travel?.estimatedTime).toBe(15);
    });

    it('should handle message without travel information', () => {
      const message = 'Hi, I need a haircut appointment for tomorrow.';
      const parsedMessage = travelManager.parseBookingMessage(message);
      
      expect(parsedMessage.travel).toBeUndefined();
    });
  });

  describe('Mobile Location Service Integration', () => {
    it('should get current location on mobile', async () => {
      const locationService = new MobileLocationService();
      const location = await locationService.getCurrentLocation();
      
      expect(location.latitude).toBe(40.7128);
      expect(location.longitude).toBe(-74.0060);
    });

    it('should geocode addresses on mobile', async () => {
      const locationService = new MobileLocationService();
      const coordinates = await locationService.geocodeAddress('123 Main St, New York, NY');
      
      expect(coordinates.latitude).toBe(40.7580);
      expect(coordinates.longitude).toBe(-73.9855);
    });

    it('should calculate travel time between locations', async () => {
      const locationService = new MobileLocationService();
      const from = { latitude: 40.7128, longitude: -74.0060 };
      const to = { latitude: 40.7580, longitude: -73.9855 };
      
      const drivingTime = await locationService.calculateTravelTime(from, to, 'driving');
      const walkingTime = await locationService.calculateTravelTime(from, to, 'walking');
      const transitTime = await locationService.calculateTravelTime(from, to, 'transit');
      
      expect(drivingTime).toBeLessThan(walkingTime);
      expect(transitTime).toBeLessThan(walkingTime);
      expect(transitTime).toBeGreaterThan(drivingTime);
    });
  });

  describe('Mobile Performance Optimization', () => {
    it('should handle rapid toggle changes efficiently', async () => {
      const startTime = performance.now();
      
      let currentState = initialState;
      for (let i = 0; i < 50; i++) {
        currentState = await travelManager.toggleTravel(currentState);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });

    it('should handle multiple address updates efficiently', async () => {
      const enabledState = await travelManager.toggleTravel(initialState);
      const addresses = [
        '123 Main St, New York, NY',
        '456 Broadway, New York, NY',
        '789 Park Ave, New York, NY',
      ];
      
      const startTime = performance.now();
      
      let currentState = enabledState;
      for (const address of addresses) {
        currentState = await travelManager.updateAddress(address, currentState);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(currentState.address).toBe('789 Park Ave, New York, NY');
    });
  });

  describe('Mobile Integration with Appointment Form', () => {
    it('should integrate travel toggle with appointment form', async () => {
      const appointmentForm: MobileAppointmentForm = {
        clientId: '1',
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: '2025-07-15T10:00:00Z',
        notes: '',
        travel: initialState,
      };
      
      // Enable travel
      appointmentForm.travel = await travelManager.toggleTravel(appointmentForm.travel);
      
      // Auto-fill from client
      appointmentForm.travel = await travelManager.autoFillFromClient(1, appointmentForm.travel);
      
      expect(appointmentForm.travel.isEnabled).toBe(true);
      expect(appointmentForm.travel.address).toBe('123 Main St, New York, NY');
      expect(appointmentForm.travel.estimatedTravelTime).toBeDefined();
    });

    it('should validate travel requirements before appointment creation', async () => {
      const appointmentForm: MobileAppointmentForm = {
        clientId: '1',
        services: [{ serviceId: 1, quantity: 1 }],
        scheduledAt: '2025-07-15T10:00:00Z',
        notes: '',
        travel: initialState,
      };
      
      // Enable travel but don't provide address
      appointmentForm.travel = await travelManager.toggleTravel(appointmentForm.travel);
      
      // Should fail validation
      const isValid = appointmentForm.travel.isEnabled ? 
        appointmentForm.travel.address.trim() !== '' : 
        true;
      
      expect(isValid).toBe(false);
      
      // Add address should make it valid
      appointmentForm.travel = await travelManager.updateAddress('123 Main St, New York, NY', appointmentForm.travel);
      
      const isValidAfterAddress = appointmentForm.travel.isEnabled ? 
        appointmentForm.travel.address.trim() !== '' : 
        true;
      
      expect(isValidAfterAddress).toBe(true);
    });
  });
});