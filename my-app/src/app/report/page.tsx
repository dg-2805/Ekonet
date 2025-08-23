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
// import MapPicker from "@/components/MapPicker"

interface UploadedFile {
  id: string
  name: string
  size: string
  type: "image" | "video" | "audio"
  url: string
  file: File
  isAnalyzing: boolean
  analysisResult?: any
  analysisError?: string
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
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)

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
    setFormData((prev) => ({
      ...prev,
      coordinates: { latitude: lat, longitude: lng },
      locationMethod: "map",
      location: `Map location (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
    }))
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

  const analyzeFile = async (fileEntry: UploadedFile) => {
    try {
      const form = new FormData();
      form.append('files', fileEntry.file, fileEntry.name);
      form.append('location', formData.location);
      form.append('description', formData.threatDescription);
      
      const resp = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        body: form
      });

      const data = await resp.json();
      console.log('🔍 Backend response:', data);
      const result = Array.isArray(data?.results) ? data.results[0] : null;
      console.log('📊 Analysis result:', result);

      if (!resp.ok || !result) {
        throw new Error(result?.error || data?.message || 'Analysis failed');
      }

      updateFileById(fileEntry.id, f => ({
        ...f,
        isAnalyzing: false,
        analysisResult: result,
        analysisError: undefined
      }));
    } catch (err: any) {
      updateFileById(fileEntry.id, f => ({
        ...f,
        isAnalyzing: false,
        analysisError: err?.message || 'Analysis error'
      }));
    }
  };

  // Update a file entry by id across all media lists
  const updateFileById = (
    id: string,
    updater: (file: UploadedFile) => UploadedFile
  ) => {
    setFormData(prev => {
      const updateList = (list: UploadedFile[]) => list.map(f => (f.id === id ? updater(f) : f));
      return {
        ...prev,
        images: updateList(prev.images),
        videos: updateList(prev.videos),
        audio: updateList(prev.audio)
      };
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      type: file.type.includes("image") ? "image" : file.type.includes("video") ? "video" : "audio",
      url: URL.createObjectURL(file),
      file: file,
      isAnalyzing: true,
      analysisResult: undefined,
      analysisError: undefined
    }))

    setFormData((prev) => ({
      ...prev,
      [newFiles[0].type === "image" ? "images" : newFiles[0].type === "video" ? "videos" : "audio"]: [
        ...prev[newFiles[0].type === "image" ? "images" : newFiles[0].type === "video" ? "videos" : "audio"],
        ...newFiles,
      ],
    }))

    // Trigger backend analysis for each new file
    newFiles.forEach(f => analyzeFile(f));
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
              <div className="space-y-6">
                <Alert className="enhanced-alert text-left">
                  <Shield className="h-5 w-5" />
                  <AlertDescription className="text-lg">
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
                      onClick={() => setShowMapPicker(!showMapPicker)}
                      className="flex items-center gap-3 px-6 py-4 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                    >
                      <MapPin className="h-5 w-5" />
                      {showMapPicker ? "Hide Map" : "Pick on Map"}
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

                  {/* {showMapPicker && (
                    <MapPicker
                      latitude={formData.coordinates.latitude}
                      longitude={formData.coordinates.longitude}
                      onLocationSelect={handleMapLocationSelect}
                      className="mt-4"
                    />
                  )} */}

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
                  Upload Evidence
                </CardTitle>
                <p className="text-base text-gray-300">
                  Add photos, videos, or audio recordings to support your report
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
                disabled={!formData.threatType || !formData.threatDescription.trim() || !formData.location.trim()}
              >
                Submit Threat Report
              </Button>
            </div>
          </form>
        </div>
      </div>

        {/* {showMapPicker && (
         <MapPicker
           latitude={formData.coordinates.latitude}
           longitude={formData.coordinates.longitude}
           onLocationSelect={handleMapLocationSelect}
           className="mt-4"
         />
       )} */}
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
                    {file.isAnalyzing ? (
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analyzing...
                      </span>
                    ) : file.analysisError ? (
                      <span className="text-red-400">Error: {file.analysisError}</span>
                    ) : file.analysisResult ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <Brain className="h-3 w-3" /> Analyzed
                        </span>
                        {file.analysisResult.analysis_result?.species?.common_name && (
                          <div className="text-xs text-slate-300">
                            {file.analysisResult.analysis_result.species.common_name}
                          </div>
                        )}
                      </div>
                    ) : null}
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