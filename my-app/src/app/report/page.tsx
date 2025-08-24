"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Trash2, Upload, Check, Camera, Video, Mic, Shield, AlertTriangle, MapPin, Loader2, Brain } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import MapPicker from "@/components/component/MapPicker"
import AuthModal from "@/components/auth-modal"

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

interface NearestNgo {
  id: string
  orgName?: string
  email?: string
  location?: string
  distanceKm: number
}

const ThreatReporting = () => {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [pendingMapCoords, setPendingMapCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [nearestNgos, setNearestNgos] = useState<NearestNgo[]>([])
  const commitMapSelection = () => {
    if (pendingMapCoords.lat !== null && pendingMapCoords.lng !== null) {
      const lat = pendingMapCoords.lat
      const lng = pendingMapCoords.lng
      setFormData((prev) => ({
        ...prev,
        coordinates: { latitude: lat, longitude: lng },
        locationMethod: "map",
        location: `Map location (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
      }))
    }
  }
  const cancelMapSelection = () => {
    setPendingMapCoords({ lat: null, lng: null })
    setIsMapPickerOpen(false)
  }
  const confirmMapLocation = () => {
    commitMapSelection()
    setIsMapPickerOpen(false)
  }

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
    "Illegal Wildlife Trade",
    "Human Wildlife Conflict",
    "Medical Care",
    "Habitat Restoration",
    "Species Recovery",
    "Other",
  ]

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    setIsLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setFormData((prev) => ({
          ...prev,
          coordinates: { latitude, longitude },
          locationMethod: "current",
          location: `Current location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
        }))
        // Also reflect in pending map coords for consistency
        setPendingMapCoords({ lat: latitude, lng: longitude })
        setIsLoadingLocation(false)
      },
      async (error) => {
        // Try an approximate IP-based fallback if precise geolocation fails
        try {
          const res = await fetch('https://ipapi.co/json/')
          if (res.ok) {
            const data = await res.json()
            const latitude = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude)
            const longitude = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude)
            if (!isNaN(latitude) && !isNaN(longitude)) {
              setFormData((prev) => ({
                ...prev,
                coordinates: { latitude, longitude },
                locationMethod: "current",
                location: `Approximate location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
              }))
              setPendingMapCoords({ lat: latitude, lng: longitude })
              setIsLoadingLocation(false)
              return
            }
          }
        } catch (_) {
          // ignore and fall through to alert
        }
        alert("Unable to get your current location. Please enter location manually or pick on the map.")
        setIsLoadingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setPendingMapCoords({ lat, lng })
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

  // This function is no longer needed since analysis happens on submit
  // Keeping it for potential future use but not calling it automatically
  const analyzeFile = async (fileEntry: UploadedFile) => {
  };

  // This function is no longer needed since we don't update files after upload
  // Keeping it for potential future use
  const updateFileById = (
    id: string,
    updater: (file: UploadedFile) => UploadedFile
  ) => {
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      type: file.type.includes("image") ? "image" : file.type.includes("video") ? "video" : "audio",
      url: URL.createObjectURL(file),
      file: file
    }))

    setFormData((prev) => ({
      ...prev,
      [newFiles[0].type === "image" ? "images" : newFiles[0].type === "video" ? "videos" : "audio"]: [
        ...prev[newFiles[0].type === "image" ? "images" : newFiles[0].type === "video" ? "videos" : "audio"],
        ...newFiles,
      ],
    }))

    // No longer trigger automatic analysis - wait for submit button
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
         // Check if user needs to login (not anonymous and not logged in)
     if (!formData.isAnonymous) {
       try {
         const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
         if (!storedUser) {
           // Open auth modal instead of redirecting
           setShowAuthModal(true)
           return
         }
       } catch {
         // If there's an error reading localStorage, open auth modal
         setShowAuthModal(true)
         return
       }
     }
    
    setIsSubmitting(true)
    
    try {
      
      // Create FormData with all form data and files
      const submitFormData = new FormData()
      
      // Add form fields (always required)
      submitFormData.append('threatType', formData.threatType)
      submitFormData.append('location', formData.location)
      submitFormData.append('threatDescription', formData.threatDescription)
      submitFormData.append('coordinates', JSON.stringify(formData.coordinates))
      submitFormData.append('locationMethod', formData.locationMethod)
      submitFormData.append('isAnonymous', formData.isAnonymous.toString())
      // Reporter name from localStorage user (if available)
      try {
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        const reporterName = storedUser ? (JSON.parse(storedUser)?.name as string | undefined) : undefined
        if (reporterName) {
          submitFormData.append('reporterName', reporterName)
        }
      } catch {}
      
      // Add files only if they exist (optional)
      const allFiles = [...formData.images, ...formData.videos, ...formData.audio]
      // Add evidence count for AI context
      submitFormData.append('evidenceCount', allFiles.length.toString())
      if (allFiles.length > 0) {
        allFiles.forEach(file => {
          submitFormData.append('files', file.file)
        })
      }
      
      // Send to our new API route
      const response = await fetch('/api/agent', {
        method: 'POST',
        body: submitFormData
      })
      
      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      setNearestNgos(Array.isArray(result?.nearestNgos) ? result.nearestNgos : [])
      setIsSubmitted(true)
    } catch (error) {
      alert("Failed to submit report. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
        <div className="fixed inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80" />
        <div className="hero-glow" />
        <div className="container mx-auto px-6 pt-36 pb-24 relative z-10">
          <div className="max-w-3xl mx-auto">
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm border border-emerald-500/30">
                <Check className="h-10 w-10 text-emerald-400" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-6">Thank You!</h1>
              <p className="text-slate-300 text-xl mb-8 leading-relaxed">
                Your wildlife threat report has been successfully submitted. Our conservation team will review your
                report and take appropriate action.
              </p>
              {nearestNgos.length > 0 && (
                <div className="text-left space-y-4 mb-8">
                  <div className="text-white font-semibold text-lg">Top nearby NGOs informed</div>
                  <div className="space-y-3">
                    {nearestNgos.map((ngo, idx) => (
                      <div key={ngo.id} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-4">
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{ngo.orgName || 'NGO'}</div>
                          <div className="text-slate-400 text-sm truncate">{ngo.email || ngo.location || '—'}</div>
                        </div>
                        <div className="text-emerald-400 font-semibold ml-4 flex-shrink-0">{ngo.distanceKm.toFixed(1)} km</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-6">
                <Alert className="enhanced-alert text-left">
                  <Shield className="h-5 w-5" />
                  <AlertDescription className="text-lg">
                    Your report ID: {" "}
                    <strong className="text-emerald-400">
                      WW-{Math.random().toString(36).substr(2, 8).toUpperCase()}
                    </strong>
                    <br />
                    Please save this ID for future reference.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => { setIsSubmitted(false); setNearestNgos([]); }}
                  className="enhanced-button-primary px-10 py-6 h-auto text-lg"
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
      <div className="container mx-auto px-6 pt-36 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                Wildlife <span className="text-gradient-nature">Threat</span> Reporting
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Help us protect wildlife by reporting threats and conservation concerns. Your information helps us take immediate action.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Location and Privacy Section */}
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 p-8">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-serif font-bold text-white">
                  <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <MapPin className="h-6 w-6 text-blue-400" />
                  </div>
                  Location & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
                  <div>
                    <Label htmlFor="anonymous-toggle" className="text-lg font-semibold text-white">Anonymous Reporting</Label>
                    <p className="text-sm text-gray-300">Submit without personal information</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-300">{formData.isAnonymous ? 'ON' : 'OFF'}</span>
                    <Switch
                      id="anonymous-toggle"
                      checked={formData.isAnonymous}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isAnonymous: checked }))}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-600"
                    />
                  </div>
                </div>

                {formData.isAnonymous && (
                  <Alert className="border-green-500/30 bg-green-500/10 text-green-100">
                    <Shield className="h-5 w-5 text-green-400" />
                    <AlertDescription className="text-base">
                      Your report will be submitted anonymously. We cannot contact you for follow-up information, but
                      your report will still reach the appropriate conservation organizations.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-6">
                  <Label className="text-lg font-semibold text-white">Incident Location</Label>

                  <div className="flex flex-wrap gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={isLoadingLocation}
                      className="flex items-center gap-3 px-6 py-4 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                    >
                      {isLoadingLocation ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <MapPin className="h-5 w-5" />
                      )}
                      Use Current Location
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsMapPickerOpen(true)
                        setPendingMapCoords({
                          lat: formData.coordinates.latitude,
                          lng: formData.coordinates.longitude,
                        })
                      }}
                      className="flex items-center gap-3 px-6 py-4 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                    >
                      <MapPin className="h-5 w-5" />
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
                      className="px-6 py-4 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                    >
                      Enter Manually
                    </Button>
                  </div>

                  {formData.coordinates.latitude && formData.coordinates.longitude && (
                    <Alert className="border-blue-500/30 bg-blue-500/10 text-blue-100">
                      <MapPin className="h-5 w-5 text-blue-400" />
                      <AlertDescription className="text-base">
                        <strong className="text-blue-300">
                          {formData.locationMethod === "current" && "Current Location Detected:"}
                          {formData.locationMethod === "manual" && "Location Coordinates:"}
                          {formData.locationMethod === "map" && "Map Location Selected:"}
                        </strong>
                        <br />
                        Latitude: {formData.coordinates.latitude.toFixed(6)}
                        <br />
                        Longitude: {formData.coordinates.longitude.toFixed(6)}
                      </AlertDescription>
                    </Alert>
                  )}

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
                              <div className="px-4 py-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30 max-w-[260px]">
                                <span className="text-emerald-400 font-medium text-sm truncate block">
                                  {pendingMapCoords.lat !== null && pendingMapCoords.lng !== null
                                    ? `Selected: ${pendingMapCoords.lat.toFixed(4)}, ${pendingMapCoords.lng.toFixed(4)}`
                                    : formData.coordinates.latitude && formData.coordinates.longitude
                                    ? `Current: ${formData.coordinates.latitude.toFixed(4)}, ${formData.coordinates.longitude.toFixed(4)}`
                                    : 'No location selected'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Map Container */}
                        <div className="flex-1 p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/50">
                          <div className="h-full rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-white/5 backdrop-blur-sm relative">
                            <div className="h-full w-full" style={{ touchAction: 'none' }}>
                                                           <MapPicker
                                latitude={(pendingMapCoords.lat ?? formData.coordinates.latitude ?? 20) || 20}
                                longitude={(pendingMapCoords.lng ?? formData.coordinates.longitude ?? 0) || 0}
                                onLocationSelect={handleMapLocationSelect}
                                className="w-full h-full"
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
                                disabled={pendingMapCoords.lat === null || pendingMapCoords.lng === null}
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

                  <Textarea
                    placeholder="Describe the location where you observed the threat. Include landmarks, nearby roads, or any identifying features..."
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    className="min-h-[120px] resize-none bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20"
                    maxLength={500}
                  />
                  <div className="text-right text-sm text-gray-300">{formData.location.length}/500 characters</div>
                </div>
              </CardContent>
            </Card>

            {/* Threat Details */}
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 p-8">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-serif font-bold text-white">
                  <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  Threat Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-lg font-semibold text-white">Type of Threat</Label>
                  <Select
                    value={formData.threatType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, threatType: value }))}
                  >
                    <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20">
                      <SelectValue placeholder="Select the type of threat" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20">
                      {threatTypes.map((threat) => (
                        <SelectItem key={threat} value={threat} className="text-white hover:bg-white/10">
                          {threat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-lg font-semibold text-white">Threat Description</Label>
                  <Textarea
                    placeholder="Provide detailed information about the threat you observed."
                    value={formData.threatDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, threatDescription: e.target.value }))}
                    className="mt-2 min-h-[120px] resize-none bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20"
                    maxLength={500}
                  />
                  <div className="text-right text-sm text-gray-300 mt-1">
                    {formData.threatDescription.length}/500 characters
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Evidence */}
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 p-8">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-serif font-bold text-white">
                  <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                    <Upload className="h-6 w-6 text-purple-400" />
                  </div>
                  Upload Evidence (Optional)
                </CardTitle>
                <p className="text-base text-gray-300">
                  Add photos, videos, or audio recordings to support your report. This is optional - you can submit a report with just the description.
                </p>
              </CardHeader>
              <CardContent>
                <UnifiedUploadSection
                  files={[...formData.images, ...formData.videos, ...formData.audio]}
                  onFileUpload={handleFileUpload}
                  onRemoveFile={removeFile}
                />
              </CardContent>
            </Card>

            <div className="flex justify-center pt-8">
              <Button
                type="submit"
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold text-lg px-12 py-6 rounded-xl shadow-2xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/40 transition-all duration-300 transform hover:scale-105"
                disabled={!formData.threatType || !formData.threatDescription.trim() || !formData.location.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Analyzing & Submitting...
                  </>
                ) : (
                  "Submit Threat Report"
                )}
              </Button>
                         </div>
           </form>
         </div>
       </div>
       
       {/* Auth Modal */}
       <AuthModal 
         open={showAuthModal} 
         mode="login" 
         onClose={() => setShowAuthModal(false)} 
       />
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
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
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
              <div className="animate-bounce mb-6">
                <Upload className="h-16 w-16 text-emerald-400 mx-auto" />
              </div>
              <p className="text-2xl font-semibold text-emerald-400">Drop files here!</p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-8">
          {/* File Type Icons */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-500/30">
              <Camera className="h-8 w-8 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Images</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-purple-500/10 backdrop-blur-sm border border-purple-500/30">
              <Video className="h-8 w-8 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">Videos</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-green-500/10 backdrop-blur-sm border border-green-500/30">
              <Mic className="h-8 w-8 text-green-400" />
              <span className="text-sm font-medium text-green-400">Audio</span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-2xl font-semibold text-white">Upload Evidence Files</p>
            <p className="text-slate-300 text-lg">
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
            <p className="text-slate-400">Supports images, videos, and audio files • Max 10MB per file</p>
          </div>
        </div>
      </div>

      {/* File Statistics */}
      {files.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6 p-6 enhanced-glass-panel">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{stats.images}</div>
              <div className="text-slate-400">Images</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">{stats.videos}</div>
              <div className="text-slate-400">Videos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">{stats.audio}</div>
              <div className="text-slate-400">Audio</div>
            </div>
          </div>
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-xl text-white">Uploaded Files ({files.length})</h4>
            <Badge variant="outline" className="text-sm px-3 py-1 border-slate-600 text-slate-300">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="grid gap-4 max-h-80 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-6 p-6 enhanced-glass-panel group hover:bg-slate-700/30 transition-all duration-200"
              >
                <div className="flex-shrink-0">
                  {file.type === "image" ? (
                    <div className="relative">
                      <img
                        src={file.url || "/placeholder.svg"}
                        alt={file.name}
                        className="w-20 h-20 object-cover rounded-xl border border-slate-600"
                      />
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-20 h-20 rounded-xl border border-slate-600 flex items-center justify-center bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-sm">
                      {file.type === "video" ? (
                        <Video className="h-8 w-8 text-purple-400" />
                      ) : (
                        <Mic className="h-8 w-8 text-green-400" />
                      )}
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                        {file.type === "video" ? (
                          <Video className="h-4 w-4 text-white" />
                        ) : (
                          <Mic className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-white text-base mb-2">{file.name}</p>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`text-sm px-3 py-1 ${
                        file.type === "image"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          : file.type === "video"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                            : "bg-green-500/20 text-green-300 border-green-500/30"
                      }`}
                    >
                      {file.type}
                    </Badge>
                    <span className="text-slate-400">{file.size}</span>
                  </div>
                  <div className="mt-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Upload className="h-3 w-3" /> Ready for analysis
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-3"
                >
                  <Trash2 className="h-5 w-5" />
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