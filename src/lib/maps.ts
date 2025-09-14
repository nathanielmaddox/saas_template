import { Loader } from '@googlemaps/js-api-loader';
import mapboxgl from 'mapbox-gl';

// Google Maps configuration
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const googleMapsLoader = new Loader({
  apiKey: GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['places', 'geometry', 'drawing'],
});

// Mapbox configuration
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (MAPBOX_ACCESS_TOKEN) {
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
}

export { mapboxgl };

// Common map utilities
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  types: string[];
  rating?: number;
  phone?: string;
  website?: string;
}

// Google Maps utilities
export class GoogleMapsService {
  private static instance: GoogleMapsService;
  private placesService: google.maps.places.PlacesService | null = null;
  private geocoder: google.maps.Geocoder | null = null;

  public static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  async initialize(): Promise<void> {
    await googleMapsLoader.load();

    // Create a dummy map element for PlacesService
    const mapElement = document.createElement('div');
    const map = new google.maps.Map(mapElement);

    this.placesService = new google.maps.places.PlacesService(map);
    this.geocoder = new google.maps.Geocoder();
  }

  async searchPlaces(query: string, location?: Coordinates): Promise<Place[]> {
    if (!this.placesService) {
      throw new Error('Google Maps not initialized');
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.TextSearchRequest = {
        query,
        ...(location && {
          location: new google.maps.LatLng(location.lat, location.lng),
          radius: 10000,
        }),
      };

      this.placesService!.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places: Place[] = results.map((place) => ({
            id: place.place_id || '',
            name: place.name || '',
            address: place.formatted_address || '',
            coordinates: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0,
            },
            types: place.types || [],
            rating: place.rating,
          }));
          resolve(places);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  async geocodeAddress(address: string): Promise<Coordinates[]> {
    if (!this.geocoder) {
      throw new Error('Google Maps not initialized');
    }

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results) {
          const coordinates = results.map((result) => ({
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          }));
          resolve(coordinates);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  async reverseGeocode(coordinates: Coordinates): Promise<string[]> {
    if (!this.geocoder) {
      throw new Error('Google Maps not initialized');
    }

    return new Promise((resolve, reject) => {
      const latLng = new google.maps.LatLng(coordinates.lat, coordinates.lng);

      this.geocoder!.geocode({ location: latLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results) {
          const addresses = results.map((result) => result.formatted_address);
          resolve(addresses);
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const earthRadius = 6371; // km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

// Mapbox utilities
export class MapboxService {
  static async searchPlaces(
    query: string,
    coordinates?: Coordinates,
    limit = 10
  ): Promise<Place[]> {
    if (!MAPBOX_ACCESS_TOKEN) {
      throw new Error('Mapbox access token not configured');
    }

    const proximity = coordinates
      ? `&proximity=${coordinates.lng},${coordinates.lat}`
      : '';

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=${limit}${proximity}`
    );

    if (!response.ok) {
      throw new Error('Mapbox search failed');
    }

    const data = await response.json();

    return data.features.map((feature: any) => ({
      id: feature.id,
      name: feature.text || feature.place_name,
      address: feature.place_name,
      coordinates: {
        lng: feature.center[0],
        lat: feature.center[1],
      },
      types: feature.place_type || [],
    }));
  }

  static async getDirections(
    start: Coordinates,
    end: Coordinates,
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<any> {
    if (!MAPBOX_ACCESS_TOKEN) {
      throw new Error('Mapbox access token not configured');
    }

    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    );

    if (!response.ok) {
      throw new Error('Mapbox directions request failed');
    }

    return response.json();
  }

  static async reverseGeocode(coordinates: Coordinates): Promise<string> {
    if (!MAPBOX_ACCESS_TOKEN) {
      throw new Error('Mapbox access token not configured');
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      throw new Error('Mapbox reverse geocoding failed');
    }

    const data = await response.json();
    return data.features[0]?.place_name || '';
  }
}

// Common utilities
export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

export const formatCoordinates = (
  coordinates: Coordinates,
  precision = 6
): string => {
  return `${coordinates.lat.toFixed(precision)}, ${coordinates.lng.toFixed(
    precision
  )}`;
};

export const isValidCoordinates = (coordinates: Coordinates): boolean => {
  return (
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180
  );
};