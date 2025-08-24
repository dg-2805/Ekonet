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
  const [mjpegUrl, setMjpegUrl] = useState<string | null>(null)

  const startWebcam = async () => {
    try {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002'
      // Start external webcam.py in backend
      await fetch(`${backend}/webcam/start_script`, { method: 'POST' }).catch(() => {})
      // Also init camera for MJPEG fallback
      await fetch(`${backend}/webcam/start`).catch(() => {})
      setMjpegUrl(`${backend}/webcam/stream`)
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
      // Call Next.js API to stop detection/webcam.py only
      fetch('/api/stop-webcam', { method: 'POST' }).catch(() => {})
      setMjpegUrl(null)
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

  // Pick a single summary event to display (prefer final_summary)
  const summaryEvent = (() => {
    const events = (outputData?.events as any[]) || []
    if (!events.length) return null
    const final = events.find((e: any) => e?.event === 'final_summary')
    return final || events[events.length - 1]
  })()

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground overflow-hidden">
      {/* Background layers like NGO dashboard */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
      <div className="fixed inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/60" />
      <div className="hero-glow" />

             <div className="max-w-[1400px] w-full mx-auto px-4 pt-20 pb-6 relative z-10 h-screen flex flex-col">
                 {/* Header */}
         <div className="mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Live Wildlife Detection</h1>
          <p className="text-slate-300">Open your webcam to preview a live feed</p>
        </div>

                 {/* Main Layout */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
           {/* Left Panel - Video Feed */}
           <div className="lg:col-span-2 overflow-hidden min-w-0 flex flex-col">
             <Card className="flex-1 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col min-w-0">
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
                  {mjpegUrl ? (
                    <img src={mjpegUrl} alt="Webcam stream" className="absolute inset-0 w-full h-full object-cover" />
                  ) : mediaStream ? (
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline />
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
                 <div className="flex items-center justify-center gap-6 mt-6">
                   <Button
                     onClick={isPlaying ? stopWebcam : startWebcam}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base font-medium"
                   >
                     {isPlaying ? <Square className="w-5 h-5 mr-3" /> : <Play className="w-5 h-5 mr-3" />}
                     {isPlaying ? "Stop Webcam" : "Start Webcam"}
                   </Button>
                 </div>
              </CardContent>
            </Card>
          </div>

                     {/* Right Panel - Analytics (placeholder, scrollable) */}
           <div className="flex flex-col min-w-0">
             <Card className="flex-1 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-xl">Detection Output</CardTitle>
              </CardHeader>
                             <CardContent className="flex-1 overflow-y-auto space-y-4 px-4">
                {outputData ? (
                  <div className="space-y-6">
                                         {/* Session Summary */}
                     <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-6">
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div>
                          <div className="text-slate-300 text-sm mb-1">Session Start</div>
                          <div className="text-white font-medium leading-relaxed">
                            <div>{new Date(outputData.session_info.start_time * 1000).toLocaleDateString()}</div>
                            <div className="text-slate-200 text-sm mt-1">{new Date(outputData.session_info.start_time * 1000).toLocaleTimeString()}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-300 text-sm mb-1">Session End</div>
                          <div className="text-white font-medium leading-relaxed">
                            <div>{new Date(outputData.session_info.end_time * 1000).toLocaleDateString()}</div>
                            <div className="text-slate-2 00 text-sm mt-1">{new Date(outputData.session_info.end_time * 1000).toLocaleTimeString()}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-300 text-sm mb-1">Total Events</div>
                          <div className="text-white font-semibold text-lg">{outputData.session_info.total_events}</div>
                        </div>
                      </div>
                    </div>

                                         {/* Detection Summary (single) */}
                     {summaryEvent?.detection_results ? (
                       <div className="rounded-xl border border-white/20 bg-white/10 p-6 space-y-6">
                        <div className="flex items-center justify-between min-w-0">
                          <div className="text-white font-semibold text-lg truncate">Detection Summary</div>
                          {summaryEvent.timestamp && (
                            <div className="text-slate-400 text-xs ml-2 flex-shrink-0">
                              {new Date(summaryEvent.timestamp * 1000).toLocaleDateString()} • {new Date(summaryEvent.timestamp * 1000).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="min-w-0">
                            <div className="text-slate-300 text-sm mb-1">Total Detections</div>
                            <div className="text-white font-medium text-lg truncate">{summaryEvent.detection_results.total_detections}</div>
                          </div>
                          {summaryEvent.detection_results.most_detected_animal && (
                            <div className="min-w-0">
                              <div className="text-slate-300 text-sm mb-1">Most Detected</div>
                              <div className="text-white font-medium text-lg truncate">
                                {summaryEvent.detection_results.most_detected_animal.animal} ({summaryEvent.detection_results.most_detected_animal.count})
                              </div>
                            </div>
                          )}
                                                     <div className="sm:col-span-2 min-w-0">
                             <div className="text-slate-300 text-sm mb-2">Top Detections</div>
                             <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                               <div className="space-y-2">
                                 {(summaryEvent.detection_results.all_animals || []).slice(0, 3).map((a: any, i: number) => (
                                   <div key={i} className="flex items-center justify-between">
                                     <span className="text-white text-sm font-medium truncate">{a.animal}</span>
                                     <span className="text-emerald-400 text-sm font-semibold ml-2">{a.count}</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-300">No detection summary available.</div>
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
