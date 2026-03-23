'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { divIcon, LatLng } from 'leaflet';

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_LAT || '37.7749');
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_LNG || '-122.4194');

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

function ClickHandler({ onSelect }: { onSelect: (latlng: LatLng) => void }) {
  useMapEvents({ click: (e) => onSelect(e.latlng) });
  return null;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef('');

  useEffect(() => {
    const key = `${center[0]},${center[1]}`;
    if (prev.current !== key) {
      prev.current = key;
      map.flyTo(center, zoom, { animate: true, duration: 0.8 });
    }
  }, [center, zoom, map]);

  return null;
}

const markerIcon = divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function LocationPicker({
  onLocationSelect,
  initialLat,
  initialLng,
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null,
  );
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(
    initialLat && initialLng ? { center: [initialLat, initialLng], zoom: 14 } : null,
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [geolocating, setGeolocating] = useState(false);

  // Try to center on user's location when no initial position is provided
  useEffect(() => {
    if (initialLat && initialLng) return;
    if (!navigator.geolocation) {
      setFlyTo({ center: [DEFAULT_LAT, DEFAULT_LNG], zoom: 12 });
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFlyTo({ center: [pos.coords.latitude, pos.coords.longitude], zoom: 14 });
        setGeolocating(false);
      },
      () => {
        setFlyTo({ center: [DEFAULT_LAT, DEFAULT_LNG], zoom: 12 });
        setGeolocating(false);
      },
      { timeout: 8000 },
    );
  }, [initialLat, initialLng]);

  const handleClick = async (latlng: LatLng) => {
    const coords: [number, number] = [latlng.lat, latlng.lng];
    setPosition(coords);
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
      );
      const data = await res.json();
      onLocationSelect(latlng.lat, latlng.lng, data.display_name);
    } catch {
      onLocationSelect(latlng.lat, latlng.lng);
    } finally {
      setLoading(false);
    }
  };

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
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const coords: [number, number] = [lat, lon];
        setFlyTo({ center: coords, zoom: 15 });
        setPosition(coords);
        onLocationSelect(lat, lon, data[0].display_name);
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
    setGeolocating(true);
    setSearchError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFlyTo({ center: coords, zoom: 16 });
        setPosition(coords);
        setGeolocating(false);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`,
          );
          const data = await res.json();
          onLocationSelect(coords[0], coords[1], data.display_name);
        } catch {
          onLocationSelect(coords[0], coords[1]);
        }
      },
      () => {
        setSearchError('Could not access your location.');
        setGeolocating(false);
      },
      { timeout: 8000 },
    );
  };

  return (
    <div className="space-y-2">
      {/* Search row */}
      <form onSubmit={handleSearch} className="flex gap-1.5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchError('');
          }}
          placeholder="Search for a location..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {searching ? '...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geolocating}
          title="Use my current location"
          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {geolocating ? 'Locating...' : 'My Location'}
        </button>
      </form>
      {searchError && <p className="text-xs text-red-500">{searchError}</p>}

      <div className="h-64 rounded-lg overflow-hidden border border-gray-300">
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
          <ClickHandler onSelect={handleClick} />
          {position && <Marker position={position} icon={markerIcon} />}
        </MapContainer>
      </div>

      {loading && <p className="text-xs text-gray-500">Looking up address...</p>}
      {geolocating && <p className="text-xs text-gray-400 italic">Detecting your location...</p>}
      {position && !loading && (
        <p className="text-xs text-gray-500">
          Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}
      {!position && !geolocating && (
        <p className="text-xs text-gray-400 italic">
          Click on the map, search, or use your current location
        </p>
      )}
    </div>
  );
}
