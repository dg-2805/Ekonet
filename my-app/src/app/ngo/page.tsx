"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Filter,
  MapPin,
  AlertTriangle,
  Eye,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  Bell,
  Settings,
  ExternalLink,
  FileText,
  ImageIcon,
  Video,
  Mic,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface Incident {
  id: string
  shortId: string
  reportedAt: string
  type: string
  location: string
  priority: "Low" | "Medium" | "High" | "Critical"
  status: "New" | "Triaged" | "Assigned" | "In-Progress" | "Resolved"
  evidence_count: number
  anonymous: boolean
  aiScore: number
  aiReport?: string
  reporterName?: string
}

interface Summary {
  openIncidents: number
  slaBreaches24h: number
  avgTriageMinutes: number
  donationsToday: number
  trend: number[]
  ngoName?: string
  ngoLocation?: string
}

const priorityColors = {
  Low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Medium: "bg-amber-500/20 text-amber-300 border-amber-500/30 px-3 py-1 rounded-full text-sm font-medium",
  High: "bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Critical: "bg-red-600/20 text-red-200 border-red-600/30 px-3 py-1 rounded-full text-sm font-medium animate-pulse",
}

const statusColors = {
  New: "bg-slate-500/20 text-slate-300 border-slate-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Triaged: "bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Assigned: "bg-violet-500/20 text-violet-300 border-violet-500/30 px-3 py-1 rounded-full text-sm font-medium",
  "In-Progress": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Resolved: "bg-gray-500/20 text-gray-300 border-gray-500/30 px-3 py-1 rounded-full text-sm font-medium",
}

export default function NGODashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [modalStatus, setModalStatus] = useState<string>("")
  const [user, setUser] = useState<any>(null)

  // Map report-analysis docs to triage incidents
  const makeShortId = (full: string): string => {
    if (!full) return ''
    const clean = String(full)
    // Prefer last 4 chars for readability; fallback to first 4
    return clean.length > 4 ? clean.slice(-4).toUpperCase() : clean.toUpperCase()
  }

  const mapUrgencyToPriority = (urgency?: string): Incident["priority"] => {
    const u = (urgency || '').toLowerCase()
    if (u === 'low') return 'Low'
    if (u === 'moderate' || u === 'medium') return 'Medium'
    if (u === 'high') return 'High'
    if (u === 'critical' || u === 'emergency') return 'Critical'
    return 'Low'
  }

  const pickIncidentType = (doc: any): string => {
    const inc = doc?.incident || {}
    const trueKey = Object.keys(inc).find(k => {
      const v = inc[k]
      return v === true || (typeof v === 'string' && v.toLowerCase() === 'true')
    })
    if (trueKey) return trueKey
    if (doc?.threat_analysis?.illegal_activity_detected) return 'Illegal Activity'
    return doc?.species?.common_name || doc?.species?.scientific_name || 'Unknown'
  }

  // Normalize timestamps that may include microseconds to a JS Date-friendly ISO string
  const normalizeTimestamp = (input: any): string | null => {
    if (typeof input !== 'string' || !input) return null
    let s = input.trim()
    // Reduce fractional seconds to milliseconds (3 digits)
    s = s.replace(/\.(\d{3})\d+/, '.$1')
    // Ensure it ends with a timezone (add Z if missing)
    if (!/(Z|[+\-]\d{2}:?\d{2})$/i.test(s)) {
      s = s + 'Z'
    }
    const d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  }

  const mapDocToIncident = (doc: any): Incident => {
    const aiScoreRaw = doc?.risk_assessment?.["ai-score"]
    const aiScore10 = typeof aiScoreRaw === 'string' ? parseFloat(aiScoreRaw) : (typeof aiScoreRaw === 'number' ? aiScoreRaw : 0)
    const evidFromRisk = doc?.risk_assessment?.evidence_count
    const evid = typeof evidFromRisk === 'string' ? parseInt(evidFromRisk, 10) : (
      typeof evidFromRisk === 'number' ? evidFromRisk : (
        Array.isArray(doc?.threat_analysis?.evidence) ? doc.threat_analysis.evidence.length : 0
      )
    )
    const reporter = (doc?.reporter_name && String(doc.reporter_name).trim()) ? String(doc.reporter_name) : (user?.name || undefined)

    // Prefer metadata.timestamp; fallback to universal_detector.file_info.created; normalize both
    const createdRaw = doc?.metadata?.universal_detector?.file_info?.created
    const timestampRaw = doc?.metadata?.timestamp
    const reportedAt = normalizeTimestamp(timestampRaw) || normalizeTimestamp(createdRaw) || new Date().toISOString()
    return {
      id: String(doc?._id || ''),
      shortId: makeShortId(String(doc?._id || '')),
      reportedAt,
      type: pickIncidentType(doc),
      location: doc?.Location || 'Unknown',
      priority: mapUrgencyToPriority(doc?.risk_assessment?.urgency),
      status: 'New',
      evidence_count: Number.isFinite(evid) ? evid : 0,
      anonymous: false,
      aiScore: Math.max(0, Math.min(10, aiScore10 || 0)),
      aiReport: doc?.risk_assessment?.["ai-report"] || '',
      reporterName: reporter,
    }
  }

  const loadReportAnalysis = async (): Promise<Incident[]> => {
    const res = await fetch('/api/report-analysis?limit=200')
    if (!res.ok) {
      console.error('Failed to fetch report-analysis:', res.status, res.statusText)
      setIncidents([])
      return []
    }
    const data = await res.json()
    const items = Array.isArray(data?.items) ? data.items : []
    const mapped = items.map(mapDocToIncident)
    setIncidents(mapped)
    console.log('📋 NGO triage incidents (from report-analysis):', mapped)
    return mapped
  }

  useEffect(() => {
    // Get user data from API using JWT token
    const fetchUserData = async () => {
      try {
        // Get JWT token from localStorage
        const token = localStorage.getItem('token')
        if (token) {
          console.log('JWT token found, fetching user data from database')
          
          // Fetch fresh user data from MongoDB using JWT token
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log('User data from API:', JSON.stringify(data.user, null, 2))
            setUser(data.user)
            
            // Fetch dashboard data after user data is loaded
            await fetchData(data.user)
          } else {
            console.error('Failed to fetch user data from API:', response.status)
            // Still fetch dashboard data even if user fetch fails
            await fetchData()
          }
        } else {
          console.log('No JWT token found, user not authenticated')
          // No token, user not logged in
          await fetchData()
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        // Still fetch dashboard data even if user fetch fails
        await fetchData()
      }
    }
    
    fetchUserData()
  }, [])

  // Fetch and console.log report-analysis documents for NGOs
  useEffect(() => {
    const fetchReportAnalysis = async () => {
      try {
        const res = await fetch('/api/report-analysis?limit=20')
        if (!res.ok) {
          console.error('Failed to fetch report-analysis:', res.status, res.statusText)
          return
        }
        const data = await res.json()
        console.log('📋 NGO report-analysis FULL (all fields):')
        // Pretty-print all fields for each document without truncation
        console.log(JSON.stringify(data.items || [], null, 2))
      } catch (err) {
        console.error('Error fetching report-analysis:', err)
      }
    }

    fetchReportAnalysis()
  }, [])

  const fetchData = async (userData?: any) => {
    try {
      // Use passed userData or fallback to state user
      const currentUser = userData || user
      
      // Create summary data using only the real user data from login
      if (currentUser) {
        const summaryData = {
          openIncidents: 18,
          slaBreaches24h: 3,
          avgTriageMinutes: 46,
          donationsToday: 1250,
          trend: [10, 12, 9, 14, 18, 16, 20],
          ngoName: currentUser.orgName,
          ngoLocation: currentUser.location
        }

        console.log('Summary data using real user login details:', JSON.stringify(summaryData, null, 2))
        setSummary(summaryData)
      }

      // Load triage incidents from report-analysis (remove hardcoded)
      await loadReportAnalysis()
    } catch (error) {
      console.error("Failed to fetch data:", error)
      // On failure, still attempt loading from report-analysis (no hardcoded data)
      await loadReportAnalysis()
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const formatDisplayTime = (dateString: string) => {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return '—'
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }).format(d)
    } catch {
      return d.toLocaleString()
    }
  }

  const updateIncidentStatus = (incidentId: string, newStatus: string) => {
    setIncidents(prevIncidents => 
      prevIncidents.map(incident => 
        incident.id === incidentId 
          ? { ...incident, status: newStatus as any }
          : incident
      )
    )
    ;(async () => {
      try {
        await fetch('/api/ngo/incidents/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: incidentId, status: newStatus })
        })
      } catch (_) {
        // no-op
      }
    })()
  }

  const trendData =
    summary?.trend.map((value, index) => ({
      day: `Day ${index + 1}`,
      incidents: value,
    })) || []

  // Filter incidents based on search query and status filter
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch = incident.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.location.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
        <div className="fixed inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/60" />
        <div className="hero-glow" />
        <div className="container mx-auto px-6 pt-36 pb-16 relative z-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/20 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white/10 rounded-2xl border border-white/20"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-white/10 rounded-2xl border border-white/20"></div>
              <div className="h-96 bg-white/10 rounded-2xl border border-white/20"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
      <div className="fixed inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/60" />
      <div className="hero-glow" />
             <div className="container mx-auto px-4 pt-36 pb-16 relative z-10">
         <div className="max-w-none mx-auto">
                 {/* Header */}
                 <div className="mb-12">
           <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-6">
               <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                 <Users className="h-8 w-8 text-emerald-500" />
               </div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                   NGO <span className="text-gradient-nature">DASHBOARD</span>
                 </h1>
                                   <div className="flex items-center gap-4 mt-2">
                    <h2 className="text-xl font-semibold text-white">
                      {user?.orgName || "Wildlife Protection NGO"}
                    </h2>
                    {user?.location && (
                      <div className="flex items-center gap-2 text-lg text-emerald-400">
                        <MapPin className="h-4 w-4" />
                        <span>Serving {user.location}</span>
                      </div>
                    )}
                  </div>
                 
               </div>
             </div>
           </div>
         </div>

                                   {/* Top Navigation */}
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 p-6 mb-8">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-6">
               <div className="flex items-center space-x-3">
                 <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                 <span className="text-lg text-emerald-400 font-medium">Active</span>
               </div>
               <div className="hidden lg:flex items-center space-x-6">
                 <Select defaultValue="all-regions">
                   <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white h-12 text-lg">
                     <SelectValue placeholder="Region" />
                   </SelectTrigger>
                   <SelectContent className="bg-background border-white/20">
                     <SelectItem value="all-regions" className="text-white hover:bg-white/10 text-lg">All Regions</SelectItem>
                     <SelectItem value="north" className="text-white hover:bg-white/10 text-lg">North Zone</SelectItem>
                     <SelectItem value="south" className="text-white hover:bg-white/10 text-lg">South Zone</SelectItem>
                   </SelectContent>
                 </Select>
                 <Select defaultValue="7d">
                   <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white h-12 text-lg">
                     <SelectValue placeholder="Period" />
                   </SelectTrigger>
                   <SelectContent className="bg-background border-white/20">
                     <SelectItem value="24h" className="text-white hover:bg-white/10 text-lg">Last 24h</SelectItem>
                     <SelectItem value="7d" className="text-white hover:bg-white/10 text-lg">Last 7d</SelectItem>
                     <SelectItem value="30d" className="text-white hover:bg-white/10 text-lg">Last 30d</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             <div className="flex items-center space-x-4">
               <Button variant="ghost" size="lg" className="text-white hover:bg-white/20">
                 <Bell className="h-5 w-5" />
               </Button>
               <Button variant="ghost" size="lg" className="text-white hover:bg-white/20">
                 <Settings className="h-5 w-5" />
               </Button>
             </div>
           </div>
         </div>

                 <div className="space-y-10">
         {/* KPI Cards */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
         >
           <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardContent className="p-6 md:p-8">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-lg text-gray-300">Open Incidents</p>
                   <p className="text-3xl font-bold text-white">{summary?.openIncidents || 0}</p>
                   <div className="w-full h-10 mt-3">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={trendData}>
                         <Line type="monotone" dataKey="incidents" stroke="#22c55e" strokeWidth={2} dot={false} />
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
                 <AlertTriangle className="h-10 w-10 text-amber-400" />
               </div>
             </CardContent>
           </Card>

                     <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardContent className="p-6 md:p-8">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-lg text-gray-300">SLA Breaches</p>
                   <p className="text-3xl font-bold text-red-400">{summary?.slaBreaches24h || 0}</p>
                   <p className="text-sm text-gray-400 mt-2">Last 24h</p>
                 </div>
                 <Clock className="h-10 w-10 text-red-400" />
               </div>
             </CardContent>
           </Card>

           <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardContent className="p-6 md:p-8">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-lg text-gray-300">Avg Triage Time</p>
                   <p className="text-3xl font-bold text-white">{summary?.avgTriageMinutes || 0}m</p>
                   <p className="text-sm text-emerald-400 mt-2">↓ 12% vs last week</p>
                 </div>
                 <TrendingUp className="h-10 w-10 text-emerald-400" />
               </div>
             </CardContent>
           </Card>

           <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardContent className="p-6 md:p-8">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-lg text-gray-300">Donations Today</p>
                   <p className="text-3xl font-bold text-white">${summary?.donationsToday || 0}</p>
                   <p className="text-sm text-emerald-400 mt-2">↑ 8% vs yesterday</p>
                 </div>
                 <DollarSign className="h-10 w-10 text-emerald-400" />
               </div>
             </CardContent>
           </Card>
        </motion.div>

                 {/* Heatmap and Filters */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="grid grid-cols-1 xl:grid-cols-3 gap-8"
         >
           <Card className="xl:col-span-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardHeader className="pb-6">
               <CardTitle className="flex items-center justify-between text-white text-2xl">
                 <span>Incident Heatmap</span>
                 <div className="flex gap-3">
                   <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg">
                     <Filter className="mr-2 h-5 w-5" />
                     Filters
                   </Button>
                 </div>
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="relative bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-xl border border-white/20 overflow-hidden h-[420px] md:h-[560px] lg:h-[600px]">
                 <iframe
                   src="/wildlife_clustering.html"
                   title="Wildlife Incident Clusters Map"
                   className="absolute inset-0 w-full h-full border-none"
                   style={{ background: "transparent" }}
                 />
               </div>
                             <div className="flex items-center justify-between mt-6">
                 <div className="flex items-center space-x-6">
                   <div className="flex items-center space-x-3">
                     <div className="w-4 h-4 bg-green-400 rounded"></div>
                     <span className="text-lg text-gray-300">Low</span>
                   </div>
                   <div className="flex items-center space-x-3">
                     <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                     <span className="text-lg text-gray-300">Medium</span>
                   </div>
                   <div className="flex items-center space-x-3">
                     <div className="w-4 h-4 bg-red-400 rounded"></div>
                     <span className="text-lg text-gray-300">High</span>
                   </div>
                   <div className="flex items-center space-x-3">
                     <div className="w-4 h-4 bg-red-600 rounded"></div>
                     <span className="text-lg text-gray-300">Critical</span>
                   </div>
                 </div>
               </div>
            </CardContent>
          </Card>

                     <div className="space-y-8">
             <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
               <CardHeader className="pb-6">
                 <CardTitle className="text-white text-2xl">Predictive Alerts</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="border-l-4 border-red-400 pl-4">
                   <p className="font-medium text-lg text-white">Poaching risk ↑ 20% in Zone C</p>
                   <p className="text-base text-gray-400 mt-1">Next 48h • 84% confidence</p>
                   <Button variant="link" className="p-0 h-auto text-base text-emerald-400 hover:text-emerald-300 mt-2">
                     Increase patrols →
                   </Button>
                 </div>
                 <div className="border-l-4 border-amber-400 pl-4">
                   <p className="font-medium text-lg text-white">Habitat disruption detected</p>
                   <p className="text-base text-gray-400 mt-1">Zone A • 72% confidence</p>
                   <Button variant="link" className="p-0 h-auto text-base text-emerald-400 hover:text-emerald-300 mt-2">
                     Deploy monitoring →
                   </Button>
                 </div>
               </CardContent>
             </Card>

             <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
               <CardHeader className="pb-6">
                 <CardTitle className="text-white text-2xl">NGO Leaderboard</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                       <span className="text-sm font-bold text-emerald-400">1</span>
                     </div>
                     <span className="text-lg font-medium text-white">{user?.orgName || "Your Organization"}</span>
                   </div>
                   <span className="text-lg text-emerald-400">94</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 bg-gray-500/20 rounded-full flex items-center justify-center border border-gray-500/30">
                       <span className="text-sm font-bold text-gray-400">2</span>
                     </div>
                     <span className="text-lg font-medium text-white">Green Trackers</span>
                   </div>
                   <span className="text-lg text-gray-400">91</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 bg-gray-500/20 rounded-full flex items-center justify-center border border-gray-500/30">
                       <span className="text-sm font-bold text-gray-400">3</span>
                     </div>
                     <span className="text-lg font-medium text-white">Nature Guard</span>
                   </div>
                   <span className="text-lg text-gray-400">88</span>
                 </div>
               </CardContent>
             </Card>
           </div>
        </motion.div>

                 {/* Triage Queue */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
           <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardHeader className="pb-6">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-6 lg:space-y-0">
                 <CardTitle className="text-white text-2xl">
                   Triage Queue
                   <span className="text-lg text-gray-400 ml-3 font-normal">
                     ({filteredIncidents.length} of {incidents.length})
                   </span>
                 </CardTitle>
                 <div className="flex flex-col lg:flex-row gap-4">
                   <Input
                     placeholder="Search incidents..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full lg:w-80 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20 h-12 text-lg"
                   />
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                     <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white h-12 text-lg">
                       <SelectValue placeholder="Filter by Status" />
                     </SelectTrigger>
                     <SelectContent className="bg-background border-white/20">
                       <SelectItem value="all" className="text-white hover:bg-white/10 text-lg">All Statuses</SelectItem>
                       <SelectItem value="New" className="text-white hover:bg-white/10 text-lg">New</SelectItem>
                       <SelectItem value="Triaged" className="text-white hover:bg-white/10 text-lg">Triaged</SelectItem>
                       <SelectItem value="Assigned" className="text-white hover:bg-white/10 text-lg">Assigned</SelectItem>
                       <SelectItem value="In-Progress" className="text-white hover:bg-white/10 text-lg">In-Progress</SelectItem>
                       <SelectItem value="Resolved" className="text-white hover:bg-white/10 text-lg">Resolved</SelectItem>
                     </SelectContent>
                   </Select>
                   <div className="flex gap-3">
                     <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg">
                       <Download className="mr-2 h-5 w-5" />
                       Export
                     </Button>
                   </div>
                 </div>
               </div>
             </CardHeader>
                         <CardContent>
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                      <TableRow className="border-white/20 py-6">
                        <TableHead className="w-16 text-white text-lg font-semibold py-6">Select</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">ID</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">Reported</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">Type</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">Location</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">Priority</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">Status</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">Evidence</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">AI Score</TableHead>
                        <TableHead className="text-white text-lg font-semibold py-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                                     <TableBody>
                     {filteredIncidents.map((incident) => (
                       <TableRow
                         key={incident.id}
                         className={`cursor-pointer hover:bg-white/10 border-white/20 py-4 ${
                           incident.aiScore >= 80 ? "border-l-4 border-l-emerald-400" : ""
                         }`}
                                                  onClick={() => {
                            setSelectedIncident(incident)
                            setModalStatus(incident.status)
                          }}
                       >
                                                 <TableCell className="py-4">
                           <Checkbox
                             checked={selectedIncidents.includes(incident.id)}
                             onCheckedChange={(checked) => {
                               if (checked) {
                                 setSelectedIncidents([...selectedIncidents, incident.id])
                               } else {
                                 setSelectedIncidents(selectedIncidents.filter((id) => id !== incident.id))
                               }
                             }}
                             onClick={(e) => e.stopPropagation()}
                             className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                           />
                         </TableCell>
                                                  <TableCell className="font-mono text-lg text-white py-4 whitespace-nowrap">{incident.shortId}</TableCell>
                          <TableCell className="text-lg text-gray-300 py-4 whitespace-nowrap">{formatDisplayTime(incident.reportedAt)}</TableCell>
                          <TableCell className="text-lg text-white py-4 max-w-[220px] truncate" title={incident.type}>{incident.type}</TableCell>
                          <TableCell className="text-lg text-gray-300 py-4 max-w-[240px] truncate" title={incident.location}>{incident.location}</TableCell>
                                                  <TableCell className="py-4">
                            <span className={`${priorityColors[incident.priority]}`}>{incident.priority}</span>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className={`${statusColors[incident.status]}`}>{incident.status}</span>
                          </TableCell>
                                                  <TableCell className="py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg text-white">{incident.evidence_count}</span>
                              <FileText className="h-4 w-4 text-gray-400" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg font-medium text-white">{incident.aiScore}</span>
                              {incident.aiScore >= 80 && <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Button
                              variant="ghost"
                              size="lg"
                              className="text-white hover:bg-white/20"
                                                            onClick={(e) => {
                                 e.stopPropagation()
                                 setSelectedIncident(incident)
                                 setModalStatus(incident.status)
                               }}
                            >
                              <Eye className="h-5 w-5" />
                            </Button>
                          </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

                 {/* Bottom Row */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="grid grid-cols-1 lg:grid-cols-2 gap-8"
         >
           <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardHeader className="pb-6">
               <CardTitle className="text-white text-2xl">Donations & Support</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-6">
                 <div>
                   <p className="text-lg text-gray-300">Active Campaign</p>
                   <p className="font-medium text-white text-xl">Emergency Wildlife Response Fund</p>
                 </div>
                 <div>
                   <p className="text-lg text-gray-300">Today's Total</p>
                   <p className="text-3xl font-bold text-emerald-400">${summary?.donationsToday || 0}</p>
                 </div>
                 <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 transform hover:scale-105 text-lg py-4">
                   <ExternalLink className="mr-2 h-5 w-5" />
                   Open Donation Portal
                 </Button>
               </div>
             </CardContent>
           </Card>

           <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
             <CardHeader className="pb-6">
               <CardTitle className="text-white text-2xl">Reports & Analytics</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 <Button variant="outline" className="w-full justify-start bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg py-4">
                   <Download className="mr-3 h-5 w-5" />
                   Export Filtered CSV
                 </Button>
                 <Button variant="outline" className="w-full justify-start bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg py-4">
                   <FileText className="mr-3 h-5 w-5" />
                   Download Weekly PDF
                 </Button>
                 <Button variant="outline" className="w-full justify-start bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg py-4">
                   <Bell className="mr-3 h-5 w-5" />
                   Subscribe to Alerts
                 </Button>
               </div>
             </CardContent>
           </Card>
         </motion.div>
      </div>

      {/* Incident Detail Modal */}
             <Dialog open={!!selectedIncident} onOpenChange={() => {
         setSelectedIncident(null)
         setModalStatus("")
       }}>
                 <DialogContent className="max-h-[90vh] text-white bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl shadow-black/30">
          <DialogHeader className="border-b border-white/20 pb-6 px-8 pt-8">
            <DialogTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  <AlertTriangle className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <span className="text-white font-mono text-lg">{selectedIncident?.shortId}</span>
                  <p className="text-sm text-gray-400">Incident Details</p>
                </div>
                                 {selectedIncident && (
                   <span className={`${priorityColors[selectedIncident.priority]}`}>
                     {selectedIncident.priority}
                   </span>
                 )}
                                 {selectedIncident && (
                   <Select 
                     value={modalStatus} 
                     onValueChange={(newStatus) => {
                       setModalStatus(newStatus)
                       updateIncidentStatus(selectedIncident.id, newStatus)
                     }}
                   >
                     <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent className="bg-background border-white/20">
                       <SelectItem value="New" className="text-white hover:bg-white/10">New</SelectItem>
                       <SelectItem value="Triaged" className="text-white hover:bg-white/10">Triaged</SelectItem>
                       <SelectItem value="Assigned" className="text-white hover:bg-white/10">Assigned</SelectItem>
                       <SelectItem value="In-Progress" className="text-white hover:bg-white/10">In-Progress</SelectItem>
                       <SelectItem value="Resolved" className="text-white hover:bg-white/10">Resolved</SelectItem>
                     </SelectContent>
                   </Select>
                 )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="px-8 pb-8">
            {selectedIncident && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-white/10 border border-white/20 mb-8 rounded-xl p-1">
                  <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">Overview</TabsTrigger>
                  <TabsTrigger value="evidence" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">Evidence</TabsTrigger>
                  <TabsTrigger value="routing" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">Routing</TabsTrigger>
                  <TabsTrigger value="notes" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <h3 className="font-semibold text-white">Threat Type</h3>
                      </div>
                      <p className="text-gray-300 text-lg">{selectedIncident.type}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                          <MapPin className="h-4 w-4 text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-white">Location</h3>
                      </div>
                      <p className="text-gray-300 text-lg">{selectedIncident.location}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        </div>
                        <h3 className="font-semibold text-white">AI Triage Score</h3>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-4xl font-bold text-white">{selectedIncident.aiScore}</span>
                        <span className="text-lg text-gray-400">/10</span>
                        {selectedIncident.aiScore  && (
                          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                          <Users className="h-4 w-4 text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-white">Reporter</h3>
                      </div>
                      <p className="text-gray-300 text-lg">
                        {selectedIncident.anonymous ? "Anonymous" : (selectedIncident.reporterName || "Identified Citizen")}
                      </p>
                    </div>
                  </div>
                                     <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-6 shadow-lg">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                         <FileText className="h-5 w-5 text-emerald-400" />
                       </div>
                       <h3 className="font-semibold text-white text-lg">AI Analysis Reason</h3>
                     </div>
                     <div className="text-emerald-100/90 text-base leading-7 break-words break-all whitespace-pre-line max-h-64 overflow-y-auto overflow-x-hidden pr-2 min-w-0">
                       {selectedIncident.aiReport || '—'}
                     </div>
                   </div>
                </TabsContent>

                <TabsContent value="evidence" className="space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    {[...Array(selectedIncident.evidence_count)].map((_, index) => (
                      <div key={index} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                                                     <div className={`p-2 rounded-lg border ${
                             index === 0 ? 'bg-emerald-500/20 border-emerald-500/30' :
                             index === 1 ? 'bg-green-500/20 border-green-500/30' :
                             'bg-teal-500/20 border-teal-500/30'
                           }`}>
                             {index === 0 && <ImageIcon className="h-5 w-5 text-emerald-400" />}
                             {index === 1 && <Video className="h-5 w-5 text-green-400" />}
                             {index === 2 && <Mic className="h-5 w-5 text-teal-400" />}
                          </div>
                          <span className="text-lg font-semibold text-white">
                            {index === 0 ? "Image" : index === 1 ? "Video" : "Audio"}
                          </span>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl h-32 flex items-center justify-center border border-white/10 mb-4">
                          <span className="text-sm text-gray-400">Preview</span>
                        </div>
                                                 {index === 0 && (
                           <div className="flex gap-2">
                             <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                               Species: Elephant
                             </Badge>
                             <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                               High Quality
                             </Badge>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="routing" className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                          <Users className="h-4 w-4 text-emerald-400" />
                        </div>
                        <label className="text-lg font-semibold text-white">Assign Team</label>
                      </div>
                      <Select defaultValue="team-a">
                        <SelectTrigger className="bg-white/10 border-white/20 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/20">
                          <SelectItem value="team-a" className="text-white hover:bg-white/10">Field Team Alpha</SelectItem>
                          <SelectItem value="team-b" className="text-white hover:bg-white/10">Field Team Beta</SelectItem>
                          <SelectItem value="team-c" className="text-white hover:bg-white/10">Rapid Response Unit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                                         <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                       <div className="flex items-center gap-3 mb-4">
                         <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                           <Clock className="h-4 w-4 text-green-400" />
                         </div>
                         <label className="text-lg font-semibold text-white">SLA Target</label>
                       </div>
                      <Select defaultValue="240">
                        <SelectTrigger className="bg-white/10 border-white/20 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-white/20">
                          <SelectItem value="60" className="text-white hover:bg-white/10">1 hour</SelectItem>
                          <SelectItem value="240" className="text-white hover:bg-white/10">4 hours</SelectItem>
                          <SelectItem value="480" className="text-white hover:bg-white/10">8 hours</SelectItem>
                          <SelectItem value="1440" className="text-white hover:bg-white/10">24 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                    <div className="flex items-center space-x-4">
                      <Checkbox id="escalate" className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 h-5 w-5" />
                      <label htmlFor="escalate" className="text-lg font-semibold text-white">
                        Mark as escalated
                      </label>
                    </div>
                  </div>
                  <Button className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 border border-emerald-500/30 backdrop-blur-xl font-semibold text-lg py-6 rounded-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-colors">
                    <Users className="mr-3 h-5 w-5" />
                    Notify Ranger Team
                  </Button>
                </TabsContent>

                <TabsContent value="notes" className="space-y-8">
                                     <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="p-2 bg-teal-500/20 rounded-lg border border-teal-500/30">
                         <FileText className="h-4 w-4 text-teal-400" />
                       </div>
                       <label className="text-lg font-semibold text-white">Add Internal Note</label>
                     </div>
                     <Textarea 
                       placeholder="Enter your notes here..." 
                       className="min-h-[140px] bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20 resize-none rounded-xl p-4 text-lg" 
                     />
                     <Button className="mt-4 bg-teal-500/15 hover:bg-teal-500/25 text-teal-100 border border-teal-500/30 backdrop-blur-xl font-semibold px-8 py-3 rounded-xl shadow-lg/50 hover:shadow-lg transition-colors">
                       Save Note
                     </Button>
                   </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                        <Clock className="h-4 w-4 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Previous Notes</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="border-l-4 border-emerald-400 pl-6 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-r-xl py-4">
                        <p className="text-gray-300 leading-relaxed">
                          Initial assessment complete. High priority due to location and evidence quality.
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <p className="text-sm text-gray-400">2h ago • Ranger Smith</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  )
}
