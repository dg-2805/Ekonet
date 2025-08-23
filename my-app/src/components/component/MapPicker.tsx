import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default markers in React Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

// Component to handle map clicks
function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

const MapPicker = ({ latitude, longitude, onLocationSelect, className = "" }: MapPickerProps) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapKey, setMapKey] = useState(0); // Force re-render when center changes

  // Initialize map center
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setMapCenter([latitude, longitude]);
      setMapKey(prev => prev + 1);
    }
  }, [latitude, longitude]);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <MapContainer
        key={mapKey}
        center={mapCenter}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
        {latitude !== null && longitude !== null && (
          <Marker position={[latitude, longitude]} />
        )}
      </MapContainer>
    </div>
  );
};

export default MapPicker;
