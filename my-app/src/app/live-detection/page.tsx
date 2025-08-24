"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Play, Pause, Square, Camera, Download, Eye, EyeOff } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { motion, AnimatePresence } from "framer-motion"

interface Detection {
  animal: string
  confidence: number
  timestamp: number
  x: number
  y: number
}

interface SessionData {
  startTime: number
  duration: number
  totalEvents: number
  allDetections: { [key: string]: number }
  leader: { animal: string; count: number; percentage: number }
  averageFps: number
  isActive: boolean
}

const animalEmojis: { [key: string]: string } = {
  Dog: "🐕",
  Cat: "🐈",
  Bird: "🐦",
  Deer: "🦌",
  Bear: "🐻",
  Fox: "🦊",
  Rabbit: "🐰",
  Squirrel: "🐿️",
}

const chartColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"]

export default function LiveDetectionPage() {
  // Poll output.json every 5 seconds
  const [outputData, setOutputData] = useState<any>(null);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchOutput = async () => {
      try {
        const res = await fetch("/api/output-json");
        if (res.ok) {
          const data = await res.json();
          setOutputData(data);
        }
      } catch {}
    };
    fetchOutput();
    interval = setInterval(fetchOutput, 5000);
    return () => clearInterval(interval);
  }, []);
  const [isPlaying, setIsPlaying] = useState(false)
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true)
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([])
  const [sessionData, setSessionData] = useState<SessionData>({
    startTime: Date.now(),
    duration: 0,
    totalEvents: 0,
    allDetections: {},
    leader: { animal: "", count: 0, percentage: 0 },
    averageFps: 0,
    isActive: false,
  })
  const [recentEvents, setRecentEvents] = useState<string[]>([])
  const [latestDetection, setLatestDetection] = useState<Detection | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  const startWebcam = async () => {
    try {
      // Start Python detection script via API
      await fetch("/api/start-webcam", { method: "POST" });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setMediaStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setIsPlaying(true)
      setSessionData((prev) => ({ ...prev, isActive: true, startTime: Date.now() }))
    } catch (err) {
      console.error("Failed to start webcam:", err)
    }
  }

  const stopWebcam = () => {
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    } finally {
      setMediaStream(null)
      setIsPlaying(false)
      setSessionData((prev) => ({ ...prev, isActive: false }))
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [mediaStream])

  const chartData = Object.entries(sessionData.allDetections).map(([animal, count]) => ({
    animal,
    count,
    emoji: animalEmojis[animal] || "🐾",
  }))

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground overflow-hidden">
      {/* Background layers like NGO dashboard */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
      <div className="fixed inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/60" />
      <div className="hero-glow" />

      <div className="max-w-[1400px] w-full mx-auto px-4 pt-28 pb-6 relative z-10 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Live Wildlife Detection</h1>
          <p className="text-slate-300">Open your webcam to preview a live feed</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Left Panel - Video Feed */}
          <div className="lg:col-span-2 overflow-hidden min-w-0">
            <Card className="h-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col min-w-0">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Live Feed</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showBoundingBoxes}
                      onCheckedChange={setShowBoundingBoxes}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <span className="text-sm text-slate-300 flex items-center gap-1">
                      {showBoundingBoxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      Overlays
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex-1 min-h-0">
                  {/* Video area */}
                  {mediaStream ? (
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-slate-200">
                        <Camera className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
                        <p className="text-white/90">Webcam is currently off</p>
                        <p className="text-sm text-slate-300">Click Start Webcam to begin</p>
                      </div>
                    </div>
                  )}

                  {/* Detection Overlays (reserved for future model output) */}
                  <AnimatePresence>
                    {showBoundingBoxes &&
                      currentDetections.map((detection, index) => (
                        <motion.div
                          key={`${detection.timestamp}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute"
                          style={{
                            left: `${detection.x}%`,
                            top: `${detection.y}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <Badge className="bg-emerald-600 text-white border-emerald-500 shadow-lg">
                            {animalEmojis[detection.animal]} {detection.animal} {detection.confidence}%
                          </Badge>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    onClick={isPlaying ? stopWebcam : startWebcam}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isPlaying ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? "Stop Webcam" : "Start Webcam"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Analytics (placeholder, scrollable) */}
          <div className="space-y-6 h-full overflow-y-auto pr-1 min-w-0">
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Detection Output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {outputData ? (
                  <div>
                    <div className="mb-2">
                      <span className="text-slate-300">Session:</span>
                      <span className="ml-2 text-white">{new Date(outputData.session_info.start_time * 1000).toLocaleString()} - {new Date(outputData.session_info.end_time * 1000).toLocaleString()}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-slate-300">Total Events:</span>
                      <span className="ml-2 text-white">{outputData.session_info.total_events}</span>
                    </div>
                    {outputData.events && outputData.events.length > 0 && (
                      <div>
                        <div className="font-bold text-white mb-2">Summary:</div>
                        {outputData.events.map((event: any, idx: number) => (
                          <div key={idx} className="mb-3 p-2 rounded bg-white/5">
                            <div className="text-emerald-400 font-semibold">{event.event}</div>
                            {event.detection_results && (
                              <div>
                                <div className="text-white">Total Detections: {event.detection_results.total_detections}</div>
                                {event.detection_results.most_detected_animal && (
                                  <div className="text-white">Most Detected: {event.detection_results.most_detected_animal.animal} ({event.detection_results.most_detected_animal.count})</div>
                                )}
                                {event.detection_results.all_animals && event.detection_results.all_animals.length > 0 && (
                                  <div className="mt-1">
                                    <div className="text-slate-300">All Animals:</div>
                                    <ul className="ml-4 text-white">
                                      {event.detection_results.all_animals.map((a: any, i: number) => (
                                        <li key={i}>{a.animal}: {a.count} ({a.percentage}%)</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-300">No output.json data found. Run detection to generate results.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
