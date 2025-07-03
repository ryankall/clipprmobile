interface MapboxTravelTimeResult {
  duration: number; // in minutes
  distance: number; // in meters
  status: 'OK' | 'ERROR';
  errorMessage?: string;
}

interface MapboxDirectionsResponse {
  routes: Array<{
    duration: number; // in seconds
    distance: number; // in meters
    legs: Array<{
      duration: number;
      distance: number;
    }>;
  }>;
  code: string;
  message?: string;
}

export class MapboxService {
  private apiKey: string;
  private baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';

  constructor() {
    if (!process.env.MAPBOX_ACCESS_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN environment variable is required');
    }
    this.apiKey = process.env.MAPBOX_ACCESS_TOKEN;
  }

  /**
   * Calculate travel time between two addresses using Mapbox Directions API
   */
  async calculateTravelTime(
    origin: string, 
    destination: string, 
    mode: 'driving' | 'walking' | 'cycling' | 'transit' = 'driving'
  ): Promise<MapboxTravelTimeResult> {
    try {
      // Handle transit mode with driving estimate + 50% buffer
      if (mode === 'transit') {
        const drivingResult = await this.calculateTravelTime(origin, destination, 'driving');
        if (drivingResult.status === 'OK') {
          return {
            duration: Math.round(drivingResult.duration * 1.5), // 50% buffer for transit
            distance: drivingResult.distance,
            status: 'OK'
          };
        }
        return drivingResult;
      }

      // Geocode addresses to get coordinates
      const originCoords = await this.geocodeAddress(origin);
      const destCoords = await this.geocodeAddress(destination);

      if (!originCoords || !destCoords) {
        return {
          duration: 0,
          distance: 0,
          status: 'ERROR',
          errorMessage: 'Unable to geocode one or both addresses'
        };
      }

      // Map modes to Mapbox profiles
      const profileMap = {
        driving: 'driving-traffic',
        walking: 'walking',
        cycling: 'cycling'
      };

      const profile = profileMap[mode];
      const coordinates = `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}`;
      
      const url = `${this.baseUrl}/${profile}/${coordinates}?access_token=${this.apiKey}&geometries=geojson&steps=false&overview=false`;

      const response = await fetch(url);
      const data: MapboxDirectionsResponse = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        return {
          duration: 0,
          distance: 0,
          status: 'ERROR',
          errorMessage: data.message || 'No route found'
        };
      }

      const route = data.routes[0];
      
      return {
        duration: Math.round(route.duration / 60), // convert seconds to minutes
        distance: route.distance,
        status: 'OK'
      };

    } catch (error) {
      console.error('Mapbox API error:', error);
      return {
        duration: 0,
        distance: 0,
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.apiKey}&limit=1`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculate travel buffers for appointments with user's transportation mode
   */
  async calculateTravelBuffer(
    origin: string,
    destination: string,
    transportationMode: 'driving' | 'walking' | 'cycling' | 'transit',
    graceTimeMinutes: number = 5
  ): Promise<number> {
    const result = await this.calculateTravelTime(origin, destination, transportationMode);
    
    if (result.status === 'ERROR') {
      // Fallback to default buffer times based on mode
      const fallbackBuffers = {
        driving: 15,
        walking: 30,
        cycling: 20,
        transit: 25
      };
      return fallbackBuffers[transportationMode] + graceTimeMinutes;
    }

    return result.duration + graceTimeMinutes;
  }
}

export const mapboxService = new MapboxService();