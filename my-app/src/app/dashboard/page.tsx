"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  Plus,
  Share2,
  MapPin,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  Upload,
  X,
  Filter,
  Calendar,
  Home,
  FileBarChart,
  Settings,
  Menu,
  Users,
  TrendingUp,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface Report {
  id: string
  threatType: string
  locationText: string
  coords: { lat: number; lng: number }
  createdAt: string
  status: "Submitted" | "Triaged" | "Assigned" | "In-Progress" | "Resolved"
  progress: number
  priority: "Low" | "Medium" | "High" | "Critical"
  etaMinutes?: number
  assignedNgo?: { id: string; name: string; logo: string }
  lastUpdate: { time: string; message: string }
  updates: Array<{ time: string; message: string }>
  evidence: Array<{ id: string; type: string; url: string }>
}

interface Summary {
  openCount: number
  resolvedCount: number
  avgResponseMinutes: number
  priorityBreakdown: { low: number; medium: number; high: number; critical: number }
}

const priorityColors = {
  Low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Medium: "bg-amber-500/20 text-amber-300 border-amber-500/30 px-3 py-1 rounded-full text-sm font-medium",
  High: "bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Critical: "bg-red-600/20 text-red-200 border-red-600/30 px-3 py-1 rounded-full text-sm font-medium animate-pulse",
}

const statusColors = {
  Submitted: "bg-slate-500/20 text-slate-300 border-slate-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Triaged: "bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Assigned: "bg-violet-500/20 text-violet-300 border-violet-500/30 px-3 py-1 rounded-full text-sm font-medium",
  "In-Progress": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 rounded-full text-sm font-medium",
  Resolved: "bg-gray-500/20 text-gray-300 border-gray-500/30 px-3 py-1 rounded-full text-sm font-medium",
}

export default function CitizenDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [summaryRes, reportsRes] = await Promise.all([fetch("/api/reporter/summary"), fetch("/api/reporter/reports")])

      const summaryData = await summaryRes.json()
      const reportsData = await reportsRes.json()

      setSummary(summaryData)
      setReports(reportsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
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

  const formatETA = (minutes?: number) => {
    if (!minutes) return "TBD"
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const pieData = summary
    ? [
        { name: "Low", value: summary.priorityBreakdown.low, color: "#22c55e" },
        { name: "Medium", value: summary.priorityBreakdown.medium, color: "#f59e0b" },
        { name: "High", value: summary.priorityBreakdown.high, color: "#ef4444" },
        { name: "Critical", value: summary.priorityBreakdown.critical, color: "#dc2626" },
      ]
    : []

           const Sidebar = () => (
      <div className="w-64 bg-white/10 backdrop-blur-xl border-r border-white/20 h-screen fixed pt-20 left-0 flex flex-col">
        <nav className="px-4 space-y-2 flex-1">
        <Button variant="ghost" className="w-full justify-start bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <Home className="mr-3 h-4 w-4" />
          Overview
        </Button>
        <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/20">
          <FileBarChart className="mr-3 h-4 w-4" />
          My Reports
        </Button>
        <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/20">
          <MapPin className="mr-3 h-4 w-4" />
          Saved Locations
        </Button>
        <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/20">
          <Bell className="mr-3 h-4 w-4" />
          Notifications
        </Button>
                 <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/20">
           <Settings className="mr-3 h-4 w-4" />
           Settings
         </Button>
       </nav>
       <div className="p-4 flex-shrink-0">
         <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
           <p className="text-sm text-gray-300">Ekonet v1.0</p>
           <p className="text-xs text-gray-400 mt-1">Citizen Portal</p>
         </div>
       </div>
     </div>
   )

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
            <div className="h-96 bg-white/10 rounded-2xl border border-white/20"></div>
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
       
               <div className="flex relative z-10 min-h-screen">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
  
          {/* Main Content */}
          <div className="flex-1 md:ml-64 p-4 md:p-6 pt-20 md:pt-20 overflow-y-auto">
           {/* Mobile Menu Button */}
           <div className="md:hidden mb-6">
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                   <Menu className="mr-2 h-4 w-4" />
                   Menu
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="w-64 p-0 bg-white/10 backdrop-blur-xl border-white/20">
                 <Sidebar />
               </SheetContent>
             </Sheet>
           </div>
           
           {/* Header */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0"
           >
             <div className="flex items-center gap-6">
               <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                 <Users className="h-8 w-8 text-emerald-500" />
               </div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                   Citizen <span className="text-gradient-nature">DASHBOARD</span>
                 </h1>
                 <p className="text-lg text-gray-300 mt-2">Track your reports & updates</p>
               </div>
             </div>
            <div className="flex space-x-3">
              <Button variant="outline" className="flex-1 md:flex-none bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Share2 className="mr-2 h-4 w-4" />
                Share App
              </Button>
              <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 transform hover:scale-105 flex-1 md:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                New Report
              </Button>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8"
          >
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-300">Open Reports</p>
                    <p className="text-3xl font-bold text-white">{summary?.openCount || 0}</p>
                    <p className="text-sm text-emerald-400 mt-2">Active cases</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-amber-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-300">Resolved</p>
                    <p className="text-3xl font-bold text-white">{summary?.resolvedCount || 0}</p>
                    <p className="text-sm text-emerald-400 mt-2">Completed cases</p>
                  </div>
                  <FileText className="h-10 w-10 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-300">Avg Response</p>
                    <p className="text-3xl font-bold text-white">{formatETA(summary?.avgResponseMinutes)}</p>
                    <p className="text-sm text-emerald-400 mt-2">Response time</p>
                  </div>
                  <Clock className="h-10 w-10 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-300">Priority Mix</p>
                    <div className="w-16 h-16 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={12} outerRadius={24} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
            <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by ID, type, location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-white/40 focus:ring-white/20 h-12 text-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg">
                      <Filter className="mr-2 h-5 w-5" />
                      Filters
                    </Button>
                    <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg">
                      <Calendar className="mr-2 h-5 w-5" />
                      Date Range
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

                     {/* Reports Timeline */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="space-y-6"
           >
             <h2 className="text-2xl font-semibold text-white">Active Reports</h2>

             {reports.length === 0 ? (
               <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20">
                 <CardContent className="p-12 text-center">
                   <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-xl font-medium text-white mb-2">No reports yet</h3>
                   <p className="text-gray-300 mb-6 text-lg">Start with your first report</p>
                   <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 transform hover:scale-105 text-lg py-4">
                     <Plus className="mr-2 h-5 w-5" />
                     Create Report
                   </Button>
                 </CardContent>
               </Card>
                           ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {reports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="w-full"
                    >
                                                <Card className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 h-full">
                           <CardContent className="p-6">
                             <div className="flex flex-col h-full">
                               <div className="flex-1">
                                 <div className="flex items-center gap-3 mb-3">
                                   <h3 className="text-lg font-semibold text-white truncate">{report.threatType}</h3>
                                   <span className={priorityColors[report.priority]}>{report.priority}</span>
                                   <span className={statusColors[report.status]}>{report.status}</span>
                                 </div>
                                 <p className="text-sm text-gray-300 flex items-center mb-2">
                                   <MapPin className="h-4 w-4 mr-1" />
                                   <span className="truncate">{report.locationText}</span>
                                 </p>
                                 <p className="text-xs text-gray-400 mb-4">
                                   ID: {report.id} • {formatTimeAgo(report.createdAt)}
                                 </p>
 
                                 <div className="space-y-3">
                                   <div>
                                     <div className="flex justify-between text-sm mb-1">
                                       <span className="text-gray-300">Progress</span>
                                       <span className="text-white font-semibold">{report.progress}%</span>
                                     </div>
                                     <Progress value={report.progress} className="h-2 bg-white/10" />
                                   </div>
 
                                   {report.assignedNgo && (
                                     <div className="flex items-center justify-between text-sm">
                                       <span className="text-gray-300">Assigned to:</span>
                                       <span className="font-medium text-white truncate">{report.assignedNgo.name}</span>
                                     </div>
                                   )}
 
                                   {report.etaMinutes && (
                                     <div className="flex items-center justify-between text-sm">
                                       <span className="text-gray-300">ETA:</span>
                                       <span className="font-medium text-white">{formatETA(report.etaMinutes)}</span>
                                     </div>
                                   )}
 
                                   <div className="flex items-center justify-between text-sm">
                                     <span className="text-gray-300">Last update:</span>
                                     <span className="text-white">{formatTimeAgo(report.lastUpdate.time)}</span>
                                   </div>
 
                                   <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                     <p className="text-sm text-gray-200 line-clamp-2">{report.lastUpdate.message}</p>
                                   </div>
                                 </div>
                               </div>
 
                               <div className="mt-4 pt-4 border-t border-white/20">
                                 <Button 
                                   variant="outline" 
                                   size="sm" 
                                   onClick={() => setSelectedReport(report)}
                                   className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                                 >
                                   <Eye className="mr-2 h-4 w-4" />
                                   View Details
                                 </Button>
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       </motion.div>
                     ))}
                   </div>
             )}
           </motion.div>
        </div>
      </div>

      {/* Report Detail Drawer */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-full md:w-1/2 lg:w-1/3 bg-white/10 backdrop-blur-2xl border-l border-white/20 shadow-2xl shadow-black/30 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/20 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedReport.id}</h2>
                  <span className={priorityColors[selectedReport.priority]}>{selectedReport.priority}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)} className="text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="overview" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-4 m-4 bg-white/10 border border-white/20 rounded-xl p-1 flex-shrink-0">
                    <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">Overview</TabsTrigger>
                    <TabsTrigger value="timeline" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">Timeline</TabsTrigger>
                    <TabsTrigger value="evidence" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">Evidence</TabsTrigger>
                    <TabsTrigger value="ngo" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-200">NGO</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <TabsContent value="overview" className="space-y-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <h3 className="font-medium text-white mb-3 text-lg">Threat Type</h3>
                      <p className="text-gray-200 text-lg">{selectedReport.threatType}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <h3 className="font-medium text-white mb-3 text-lg">Location</h3>
                      <p className="text-gray-200 text-lg">{selectedReport.locationText}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {selectedReport.coords.lat.toFixed(4)}, {selectedReport.coords.lng.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <h3 className="font-medium text-white mb-3 text-lg">Status</h3>
                      <span className={statusColors[selectedReport.status]}>{selectedReport.status}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                      <h3 className="font-medium text-white mb-3 text-lg">Reported</h3>
                      <p className="text-gray-200 text-lg">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-6">
                    <div className="space-y-4">
                      {selectedReport.updates.map((update, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="w-3 h-3 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex-1">
                            <p className="text-lg text-gray-200">{update.message}</p>
                            <p className="text-sm text-gray-400 mt-2">{formatTimeAgo(update.time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="evidence" className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedReport.evidence.map((item) => (
                        <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <span className="text-lg font-medium text-white capitalize">{item.type}</span>
                          </div>
                          <div className="bg-white/10 rounded-xl h-24 flex items-center justify-center border border-white/20">
                            <span className="text-sm text-gray-400">Preview</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg py-4" variant="outline">
                      <Upload className="mr-2 h-5 w-5" />
                      Add Evidence
                    </Button>
                  </TabsContent>

                  <TabsContent value="ngo" className="space-y-6">
                    {selectedReport.assignedNgo ? (
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                        <h3 className="font-medium text-white mb-4 text-lg">Assigned NGO</h3>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <h4 className="font-medium text-white text-lg">{selectedReport.assignedNgo.name}</h4>
                          <p className="text-gray-300 mt-2">Contact information available upon request</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-lg">No NGO assigned yet</p>
                      </div>
                    )}
                  </TabsContent>
                  </div>
                </Tabs>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
