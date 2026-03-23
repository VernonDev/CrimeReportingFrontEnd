'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import { Report } from '@/lib/api';
import CrimeMarker from './CrimeMarker';

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_LAT || '37.7749');
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_LNG || '-122.4194');
const DEFAULT_ZOOM = parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM || '12');

interface BoundsTrackerProps {
  onBoundsChange: (bounds: {
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
  }) => void;
}

function BoundsTracker({ onBoundsChange }: BoundsTrackerProps) {
  const map = useMapEvents({
    moveend() {
      emitBounds(map.getBounds());
    },
    zoomend() {
      emitBounds(map.getBounds());
    },
  });

  function emitBounds(bounds: LatLngBounds) {
    onBoundsChange({
      neLat: bounds.getNorthEast().lat,
      neLng: bounds.getNorthEast().lng,
      swLat: bounds.getSouthWest().lat,
      swLng: bounds.getSouthWest().lng,
    });
  }

  // Emit initial bounds
  const emitted = useRef(false);
  useEffect(() => {
    if (!emitted.current) {
      emitted.current = true;
      emitBounds(map.getBounds());
    }
  });

  return null;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef('');

  useEffect(() => {
    const key = `${center[0]},${center[1]}`;
    if (prev.current !== key) {
      prev.current = key;
      map.flyTo(center, zoom, { animate: true, duration: 1.2 });
    }
  }, [center, zoom, map]);

  return null;
}

interface MapViewProps {
  reports: Report[];
  onBoundsChange?: (bounds: {
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
  }) => void;
  onMarkerClick?: (report: Report) => void;
}

export default function MapView({ reports, onBoundsChange, onMarkerClick }: MapViewProps) {
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Fly to user's current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setFlyTo({ center: [DEFAULT_LAT, DEFAULT_LNG], zoom: DEFAULT_ZOOM });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTo({ center: [pos.coords.latitude, pos.coords.longitude], zoom: DEFAULT_ZOOM });
      },
      () => {
        setFlyTo({ center: [DEFAULT_LAT, DEFAULT_LNG], zoom: DEFAULT_ZOOM });
      },
      { timeout: 8000 },
    );
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await res.json();
      if (data.length === 0) {
        setSearchError('Location not found. Try a more specific name.');
      } else {
        setFlyTo({ center: [parseFloat(data[0].lat), parseFloat(data[0].lon)], zoom: 13 });
      }
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }
    setSearchError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTo({ center: [pos.coords.latitude, pos.coords.longitude], zoom: DEFAULT_ZOOM });
      },
      () => setSearchError('Could not access your location.'),
      { timeout: 8000 },
    );
  };

  return (
    <div className="relative h-full w-full">
      {/* Search overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-3">
        <form onSubmit={handleSearch} className="flex gap-1.5 shadow-lg">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError('');
            }}
            placeholder="Search location..."
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {searching ? '...' : 'Go'}
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            title="Use my current location"
            className="px-3 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            My Location
          </button>
        </form>
        {searchError && (
          <p className="mt-1 text-xs text-red-600 bg-white px-2 py-1 rounded shadow">
            {searchError}
          </p>
        )}
      </div>

      <MapContainer
        center={[DEFAULT_LAT, DEFAULT_LNG]}
        zoom={3}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {flyTo && <MapController center={flyTo.center} zoom={flyTo.zoom} />}
        {onBoundsChange && <BoundsTracker onBoundsChange={onBoundsChange} />}
        {reports.map((report) => (
          <CrimeMarker key={report.id} report={report} onClick={onMarkerClick} />
        ))}
      </MapContainer>
    </div>
  );
}
