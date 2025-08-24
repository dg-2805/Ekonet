interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

declare const MapPicker: import('react').ComponentType<MapPickerProps>;
export default MapPicker;
