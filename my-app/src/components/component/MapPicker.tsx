import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default markers in React Leaflet
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

  const map = useMapEvents({
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapKey, setMapKey] = useState(0); // Force re-render when center changes

  // Initialize map center
  useEffect(() => {
    if (latitude && longitude) {
      setMapCenter([latitude, longitude]);
      setMapKey(prev => prev + 1);
    }
  }, [latitude, longitude]);

  // Mock geocoding function with better wildlife locations
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Enhanced mock search results with more wildlife locations
      const mockResults = [
        { name: "Central Park, New York", lat: 40.7829, lng: -73.9654 },
        { name: "Yellowstone National Park", lat: 44.4280, lng: -110.5885 },
        { name: "Amazon Rainforest, Brazil", lat: -3.4653, lng: -62.2159 },
        { name: "Serengeti National Park, Tanzania", lat: -2.3333, lng: 34.8333 },
        { name: "Great Barrier Reef, Australia", lat: -18.2871, lng: 147.6992 },
        { name: "Kruger National Park, South Africa", lat: -24.0965, lng: 31.5962 },
        { name: "Galápagos Islands, Ecuador", lat: -0.9538, lng: -91.0236 },
        { name: "Banff National Park, Canada", lat: 51.4968, lng: -115.9281 },
        { name: "Masai Mara, Kenya", lat: -1.5056, lng: 35.1444 },
        { name: "Costa Rica", lat: 9.7489, lng: -83.7534 },
      ];
      
      const result = mockResults.find(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchQuery.toLowerCase().includes(r.name.toLowerCase().split(',')[0])
      );
      
      if (result) {
        setMapCenter([result.lat, result.lng]);
        setMapKey(prev => prev + 1);
        onLocationSelect(result.lat, result.lng);
      } else {
        // If no match found, show a message or use first result as fallback
        alert(`Location "${searchQuery}" not found. Try searching for wildlife parks or famous locations.`);
      }
      
      setIsSearching(false);
    }, 800);
  };

  const handleQuickLocation = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapKey(prev => prev + 1);
    onLocationSelect(lat, lng);
  };

  return (
    <Card className={`nature-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Select Location on Map
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search for a location (e.g., Yellowstone, Amazon, Serengeti)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
          />
          <Button 
            type="button"
            variant="outline" 
            onClick={searchLocation}
            disabled={isSearching}
            className="flex-shrink-0"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Real Map */}
        <div className="relative">
          <div className="w-full h-80 rounded-lg border border-border">
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
              {latitude && longitude && (
                <Marker position={[latitude, longitude]} />
              )}
            </MapContainer>
          </div>
          
          {/* Instructions overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white text-sm p-3 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>Click anywhere on the map to drop a pin and select coordinates</span>
            </div>
          </div>
        </div>

        {/* Coordinates Display */}
        {latitude && longitude && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Latitude</Label>
              <Input value={latitude.toFixed(6)} readOnly className="mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Longitude</Label>
              <Input value={longitude.toFixed(6)} readOnly className="mt-1 font-mono" />
            </div>
          </div>
        )}

        {/* Quick Location Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Wildlife Hotspots</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickLocation(44.4280, -110.5885)}
              className="text-xs justify-start"
            >
              �️ Yellowstone
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickLocation(-3.4653, -62.2159)}
              className="text-xs justify-start"
            >
              🌳 Amazon
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickLocation(-2.3333, 34.8333)}
              className="text-xs justify-start"
            >
              🦁 Serengeti
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickLocation(-24.0965, 31.5962)}
              className="text-xs justify-start"
            >
              🐘 Kruger
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickLocation(-18.2871, 147.6992)}
              className="text-xs justify-start"
            >
              🐠 Great Barrier Reef
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickLocation(-0.9538, -91.0236)}
              className="text-xs justify-start"
            >
              🐢 Galápagos
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapPicker;
