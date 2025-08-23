"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, Upload, Check, Camera, Video, Mic, Shield, AlertTriangle, MapPin, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import dynamic from "next/dynamic"

// Create a complete Map component that will be dynamically loaded
const DynamicMap = dynamic(
  () => {
    return Promise.resolve(({ 
      center, 
      onLocationSelect, 
      existingMarker 
    }: { 
      center: [number, number]; 
      onLocationSelect: (lat: number, lng: number) => void;
      existingMarker?: [number, number] | null;
    }) => {
      const { MapContainer, TileLayer, Marker, useMapEvents } = require("react-leaflet");
      const [position, setPosition] = useState<[number, number] | null>(null);

      function LocationMarker() {
        const map = useMapEvents({
          click(e: any) {
            const { lat, lng } = e.latlng;
            setPosition([lat, lng]);
            onLocationSelect(lat, lng);
          },
        });

        return position === null ? null : (
          <Marker position={position} />
        );
      }

      return (
        <MapContainer
          center={center}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          className="rounded-xl"
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
          animate={true}
          easeLinearity={0.35}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
          {existingMarker && (
            <Marker position={existingMarker} />
          )}
        </MapContainer>
      );
    });
  },
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-slate-800/50 rounded-xl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-3" />
          <p className="text-white text-lg">Loading map...</p>
        </div>
      </div>
    )
  }
)

interface UploadedFile {
  id: string
  name: string
  size: string
  type: "image" | "video" | "audio"
  url: string
  file: File
}

interface ThreatFormData {
  threatType: string
  location: string
  threatDescription: string
  coordinates: {
    latitude: number | null
    longitude: number | null
  }
  locationMethod: "current" | "manual" | "map" | ""
  images: UploadedFile[]
  videos: UploadedFile[]
  audio: UploadedFile[]
  isAnonymous: boolean
}

const ThreatReporting = () => {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [tempMapLocation, setTempMapLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Load Leaflet CSS and fix icons on client side only
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)

    // Add custom CSS for smooth map interactions
    const style = document.createElement('style')
    style.textContent = `
      .leaflet-container {
        background: #1a1a1a !important;
      }
      .leaflet-control-zoom {
        border: none !important;
        background: rgba(255, 255, 255, 0.1) !important;
        backdrop-filter: blur(10px) !important;
      }
      .leaflet-control-zoom a {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: white !important;
      }
      .leaflet-control-zoom a:hover {
        background: rgba(255, 255, 255, 0.2) !important;
      }
      .leaflet-tile {
        filter: brightness(0.8) contrast(1.2) !important;
      }
    `
    document.head.appendChild(style)

    // Fix Leaflet default markers
    const L = require('leaflet')
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(style)
    }
  }, [])

  const [formData, setFormData] = useState<ThreatFormData>({
    threatType: "",
    location: "",
    threatDescription: "",
    coordinates: {
      latitude: null,
      longitude: null,
    },
    locationMethod: "",
    images: [],
    videos: [],
    audio: [],
    isAnonymous: false,
  })

  const threatTypes = [
    "Poaching",
    "Habitat Loss",
    "Pollution",
    "Climate Change",
    "Illegal Wildlife Trade",
    "Deforestation",
    "Other",
  ]

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    setIsLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setFormData((prev) => ({
          ...prev,
          coordinates: { latitude, longitude },
          locationMethod: "current",
          location: `Current location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
        }))
        setIsLoadingLocation(false)
      },
      (error) => {
        console.error("Error getting location:", error)
        alert("Unable to get your current location. Please enter location manually.")
        setIsLoadingLocation(false)
      },
    )
  }

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setTempMapLocation({ latitude: lat, longitude: lng })
  }

  const confirmMapLocation = () => {
    if (tempMapLocation) {
      setFormData((prev) => ({
        ...prev,
        locationMethod: "map",
        coordinates: { latitude: tempMapLocation.latitude, longitude: tempMapLocation.longitude },
        location: `Map location (${tempMapLocation.latitude.toFixed(6)}, ${tempMapLocation.longitude.toFixed(6)})`,
      }))
      setTempMapLocation(null)
      setIsMapPickerOpen(false)
    }
  }

  const cancelMapSelection = () => {
    setTempMapLocation(null)
    setIsMapPickerOpen(false)
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      type: file.type.includes("image") ? "image" : file.type.includes("video") ? "video" : "audio",
      url: URL.createObjectURL(file),
      file: file,
    }))

    setFormData((prev) => ({
      ...prev,
      [newFiles[0].type === "image" ? "images" : newFiles[0].type === "video" ? "videos" : "audio"]: [
        ...prev[newFiles[0].type === "image" ? "images" : newFiles[0].type === "video" ? "videos" : "audio"],
        ...newFiles,
      ],
    }))
  }

  const removeFile = (id: string) => {
    const fileToRemove =
      formData.images.find((file) => file.id === id) ||
      formData.videos.find((file) => file.id === id) ||
      formData.audio.find((file) => file.id === id)

    if (!fileToRemove) return

    setFormData((prev) => ({
      ...prev,
      [fileToRemove.type === "image" ? "images" : fileToRemove.type === "video" ? "videos" : "audio"]: prev[
        fileToRemove.type === "image" ? "images" : fileToRemove.type === "video" ? "videos" : "audio"
      ].filter((file) => file.id !== id),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Submitted data:", formData)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
        <div className="fixed inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80" />
        <div className="hero-glow" />
              <div className="container mx-auto px-4 pt-36 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto">
                        <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 p-16 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full flex items-center justify-center mb-10 backdrop-blur-sm border border-emerald-500/30">
                <Check className="h-12 w-12 text-emerald-400" />
              </div>
              <h1 className="text-5xl font-bold text-white mb-8">Thank You!</h1>
              <p className="text-slate-300 text-2xl mb-10 leading-relaxed">
                Your wildlife threat report has been successfully submitted. Our conservation team will review your
                report and take appropriate action.
              </p>
              <div className="space-y-8">
                <Alert className="enhanced-alert text-left p-8">
                  <Shield className="h-6 w-6" />
                  <AlertDescription className="text-xl">
                    Your report ID:{" "}
                    <strong className="text-emerald-400">
                      WW-{Math.random().toString(36).substr(2, 8).toUpperCase()}
                    </strong>
                    <br />
                    Please save this ID for future reference.
                  </AlertDescription>
                </Alert>
              <Button
                  onClick={() => setIsSubmitted(false)}
                  className="enhanced-button-primary px-12 py-8 h-auto text-xl"
              >
                Submit Another Report
              </Button>
            </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
      <div className="fixed inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80" />
      <div className="hero-glow" />
      <div className="container mx-auto px-4 pt-36 pb-20 relative z-10">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                Wildlife <span className="text-gradient-nature">Threat</span> Reporting
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Help us protect wildlife by reporting threats and conservation concerns. Your information helps us take immediate action.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Location and Privacy Section */}
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
              <CardContent className="p-6 lg:p-8">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-4 text-2xl font-serif font-bold text-white">
                    <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <MapPin className="h-8 w-8 text-blue-400" />
                    </div>
                    Location & Privacy
                  </CardTitle>
                </CardHeader>
                <div className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                  <div>
                    <Label htmlFor="anonymous-toggle" className="text-xl font-semibold text-white">Anonymous Reporting</Label>
                    <p className="text-lg text-gray-300 mt-1">Submit without personal information</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg text-gray-300">{formData.isAnonymous ? 'ON' : 'OFF'}</span>
                    <Switch
                      id="anonymous-toggle"
                      checked={formData.isAnonymous}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isAnonymous: checked }))}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>
                </div>

                {formData.isAnonymous && (
                  <Alert className="border-green-500/30 bg-green-500/10 text-green-100 p-6">
                    <Shield className="h-6 w-6 text-green-400" />
                    <AlertDescription className="text-lg">
                      Your report will be submitted anonymously. We cannot contact you for follow-up information, but
                      your report will still reach the appropriate conservation organizations.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-6">
                  <Label className="text-xl font-semibold text-white">Incident Location</Label>

                  <div className="flex flex-wrap gap-4">
                                        <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={isLoadingLocation}
                      className="flex items-center gap-3 px-6 py-4 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200 text-lg"
                    >
                      {isLoadingLocation ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <MapPin className="h-6 w-6" />
                      )}
                      Use Current Location
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTempMapLocation(null)
                        setIsMapPickerOpen(true)
                      }}
                      className="flex items-center gap-3 px-6 py-4 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200 text-lg"
                    >
                      <MapPin className="h-6 w-6" />
                      Pick on Map
                    </Button>

                    <Button
                    type="button"
                      variant="outline"
                    onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          locationMethod: "manual",
                          coordinates: { latitude: null, longitude: null },
                          location: "",
                        }))
                      }}
                      className="px-6 py-4 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200 text-lg"
                    >
                      Enter Manually
                    </Button>
                </div>

                  {formData.coordinates.latitude && formData.coordinates.longitude && (
                    <Alert className="border-blue-500/30 bg-blue-500/10 text-blue-100 p-6">
                      <MapPin className="h-6 w-6 text-blue-400" />
                      <AlertDescription className="text-lg">
                        <strong className="text-blue-300">
                          {formData.locationMethod === "current" && "Current Location Detected:"}
                          {formData.locationMethod === "manual" && "Location Coordinates:"}
                          {formData.locationMethod === "map" && "Map Location Selected:"}
                        </strong>
                        <br />
                        Latitude: {formData.coordinates.latitude?.toFixed(6) || 'Not set'}
                        <br />
                        Longitude: {formData.coordinates.longitude?.toFixed(6) || 'Not set'}
                      </AlertDescription>
                    </Alert>
                  )}



                  <Textarea
                    placeholder="Describe the location where you observed the threat. Include landmarks, nearby roads, or any identifying features..."
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    className="min-h-[160px] resize-none bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20 text-lg p-4 lg:p-6"
                    maxLength={500}
                  />
                  <div className="text-right text-lg text-gray-300">{formData.location.length}/500 characters</div>
                </div>
              </div>
            </CardContent>
          </Card>

                        {/* Threat Details */}
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
              <CardContent className="p-6 lg:p-8">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-4 text-2xl font-serif font-bold text-white">
                    <div className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                      <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                    Threat Details
                  </CardTitle>
                </CardHeader>
                <div className="space-y-8">
                <div>
                  <Label className="text-xl font-semibold text-white">Type of Threat</Label>
                  <Select
                    value={formData.threatType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, threatType: value }))}
                  >
                    <SelectTrigger className="mt-3 bg-white/10 border-white/20 text-white h-12 text-lg">
                      <SelectValue placeholder="Select the type of threat" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-white/20">
                      {threatTypes.map((threat) => (
                        <SelectItem key={threat} value={threat} className="text-white hover:bg-white/10 text-lg">
                          {threat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xl font-semibold text-white">Threat Description</Label>
                  <Textarea
                    placeholder="Provide detailed information about the threat you observed."
                    value={formData.threatDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, threatDescription: e.target.value }))}
                    className="mt-3 min-h-[160px] resize-none bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20 text-lg p-4 lg:p-6"
                    maxLength={500}
                  />
                  <div className="text-right text-lg text-gray-300 mt-2">
                    {formData.threatDescription.length}/500 characters
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Upload Evidence */}
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
              <CardContent className="p-6 lg:p-8">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-4 text-2xl font-serif font-bold text-white">
                    <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                      <Upload className="h-8 w-8 text-purple-400" />
                    </div>
                    Upload Evidence
                  </CardTitle>
                  <p className="text-lg text-gray-300 mt-2">
                    Add photos, videos, or audio recordings to support your report
                  </p>
                </CardHeader>
                <div>
                  <UnifiedUploadSection
                    files={[...formData.images, ...formData.videos, ...formData.audio]}
                    onFileUpload={handleFileUpload}
                    onRemoveFile={removeFile}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center pt-8">
              <Button
                type="submit"
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold text-xl px-12 py-6 rounded-xl shadow-2xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/40 transition-all duration-300 transform hover:scale-105"
                disabled={!formData.threatType || !formData.threatDescription.trim() || !formData.location.trim()}
              >
                Submit Threat Report
              </Button>
            </div>
          </form>
              </div>
            </div>

      {/* Map Picker Modal */}
      <Dialog open={isMapPickerOpen} onOpenChange={setIsMapPickerOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] bg-background/95 backdrop-blur-xl border border-white/20 text-white rounded-2xl shadow-2xl shadow-black/40 p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Select Location on Map</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-full">
                        {/* Header */}
            <div className="p-8 border-b border-white/20 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shadow-lg flex-shrink-0">
                    <MapPin className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-white">Select Location on Map</h2>
                    <p className="text-slate-300 text-lg mt-1">Click on the map to choose the exact location</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-6">
                  <div className="px-4 py-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30 max-w-[220px]">
                                      <span className="text-emerald-400 font-medium text-sm truncate block">
                    {tempMapLocation 
                      ? `Selected: ${tempMapLocation.latitude.toFixed(4)}, ${tempMapLocation.longitude.toFixed(4)}`
                      : formData.coordinates.latitude && formData.coordinates.longitude 
                      ? `Current: ${formData.coordinates.latitude.toFixed(4)}, ${formData.coordinates.longitude.toFixed(4)}`
                      : 'No location selected'
                    }
                  </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Map Container */}
            <div className="flex-1 p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/50">
              <div className="h-full rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-white/5 backdrop-blur-sm relative">
                <div className="h-full w-full" style={{ touchAction: 'none' }}>
                  <DynamicMap
                    center={[formData.coordinates.latitude ?? 20, formData.coordinates.longitude ?? 0]}
                    onLocationSelect={handleMapLocationSelect}
                    existingMarker={
                      tempMapLocation
                        ? [tempMapLocation.latitude, tempMapLocation.longitude]
                        : formData.coordinates.latitude && formData.coordinates.longitude
                        ? [formData.coordinates.latitude, formData.coordinates.longitude]
                        : null
                    }
                  />
                </div>
                

              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/20 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm">Click to select location</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Current position</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={cancelMapSelection}
                    className="px-6 py-3 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmMapLocation}
                    disabled={!tempMapLocation}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Location
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const UnifiedUploadSection = ({
  files,
  onFileUpload,
  onRemoveFile,
}: {
  files: UploadedFile[]
  onFileUpload: (files: FileList | null) => void
  onRemoveFile: (id: string) => void
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter((prev) => prev + 1)
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter((prev) => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragCounter(0)
    const files = e.dataTransfer.files
    onFileUpload(files)
  }

  const getFileTypeStats = () => {
    const stats = {
      images: files.filter((f) => f.type === "image").length,
      videos: files.filter((f) => f.type === "video").length,
      audio: files.filter((f) => f.type === "audio").length,
    }
    return stats
  }

  const stats = getFileTypeStats()

  return (
        <div className="space-y-8">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 lg:p-16 text-center transition-all duration-300 ${
          isDragOver
            ? "border-emerald-400 bg-emerald-500/10 scale-[1.02] shadow-2xl shadow-emerald-500/20"
            : "border-slate-600 hover:border-emerald-500/50 hover:bg-slate-800/50"
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-bounce mb-8">
                <Upload className="h-20 w-20 text-emerald-400 mx-auto" />
              </div>
                              <p className="text-2xl font-semibold text-emerald-400">Drop files here!</p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-8">
          {/* File Type Icons */}
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-500/30">
              <Camera className="h-10 w-10 text-blue-400" />
              <span className="text-lg font-medium text-blue-400">Images</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-purple-500/10 backdrop-blur-sm border border-purple-500/30">
              <Video className="h-10 w-10 text-purple-400" />
              <span className="text-lg font-medium text-purple-400">Videos</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-green-500/10 backdrop-blur-sm border border-green-500/30">
              <Mic className="h-10 w-10 text-green-400" />
              <span className="text-lg font-medium text-green-400">Audio</span>
            </div>
                </div>

          <div className="space-y-4">
                          <p className="text-2xl font-semibold text-white">Upload Evidence Files</p>
            <p className="text-slate-300 text-xl">
              Drag & drop files here, or{" "}
              <label className="text-emerald-400 cursor-pointer hover:underline font-medium">
                browse files
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  className="hidden"
                  onChange={(e) => onFileUpload(e.target.files)}
                />
              </label>
            </p>
            <p className="text-slate-400 text-lg">Supports images, videos, and audio files • Max 10MB per file</p>
          </div>
        </div>
      </div>

            {/* File Statistics */}
      {files.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 p-6 lg:p-8 enhanced-glass-panel">
            <div className="text-center">
                              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.images}</div>
              <div className="text-slate-400 text-lg">Images</div>
            </div>
            <div className="text-center">
                              <div className="text-3xl font-bold text-purple-400 mb-2">{stats.videos}</div>
              <div className="text-slate-400 text-lg">Videos</div>
            </div>
            <div className="text-center">
                              <div className="text-3xl font-bold text-green-400 mb-2">{stats.audio}</div>
              <div className="text-slate-400 text-lg">Audio</div>
                              </div>
                            </div>
                          </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-2xl text-white">Uploaded Files ({files.length})</h4>
            <Badge variant="outline" className="text-lg px-4 py-2 border-slate-600 text-slate-300">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </Badge>
          </div>

                    <div className="grid gap-6 max-h-96 lg:grid-cols-2 xl:grid-cols-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-6 lg:gap-8 p-6 lg:p-8 enhanced-glass-panel group hover:bg-slate-700/30 transition-all duration-200 rounded-xl"
              >
                <div className="flex-shrink-0">
                  {file.type === "image" ? (
                    <div className="relative">
                      <img
                        src={file.url || "/placeholder.svg"}
                        alt={file.name}
                        className="w-24 h-24 object-cover rounded-xl border border-slate-600"
                      />
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-24 h-24 rounded-xl border border-slate-600 flex items-center justify-center bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-sm">
                      {file.type === "video" ? (
                        <Video className="h-10 w-10 text-purple-400" />
                      ) : (
                        <Mic className="h-10 w-10 text-green-400" />
                      )}
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                        {file.type === "video" ? (
                          <Video className="h-5 w-5 text-white" />
                        ) : (
                          <Mic className="h-5 w-5 text-white" />
                        )}
                      </div>
                  </div>
                )}
            </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-white text-lg mb-3">{file.name}</p>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="secondary"
                      className={`text-lg px-4 py-2 ${
                        file.type === "image"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          : file.type === "video"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                            : "bg-green-500/20 text-green-300 border-green-500/30"
                      }`}
                    >
                      {file.type}
                    </Badge>
                    <span className="text-slate-400 text-lg">{file.size}</span>
            </div>
              </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => onRemoveFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-4"
                >
                  <Trash2 className="h-6 w-6" />
                </Button>
              </div>
            ))}
      </div>
        </div>
      )}
    </div>
  )
}

export default ThreatReporting
