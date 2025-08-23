import { NextResponse } from "next/server"

export async function GET() {
  // Mock data for citizen reports
  const reports = [
    {
      id: "WW-7G2H9A",
      threatType: "Poaching",
      locationText: "Near River Bend, Sector 5",
      coords: { lat: 12.9123, lng: 77.6123 },
      createdAt: "2025-08-20T09:21:00Z",
      status: "Assigned",
      progress: 56,
      priority: "High",
      etaMinutes: 240,
      assignedNgo: {
        id: "ngo-12",
        name: "Wildlife Shield",
        logo: "/logos/shield.png",
      },
      lastUpdate: {
        time: "2025-08-21T12:00:00Z",
        message: "Ranger team dispatched",
      },
      updates: [
        { time: "2025-08-21T12:00:00Z", message: "Ranger team dispatched" },
        { time: "2025-08-20T18:00:00Z", message: "Case assigned to NGO" },
        { time: "2025-08-20T10:00:00Z", message: "AI triage: High priority" },
      ],
      evidence: [
        { id: "f1", type: "image", url: "/mock/1.jpg" },
        { id: "f2", type: "audio", url: "/mock/2.mp3" },
      ],
    },
    {
      id: "WW-8H3K2B",
      threatType: "Habitat Destruction",
      locationText: "Forest Edge, Zone 3",
      coords: { lat: 12.8456, lng: 77.5789 },
      createdAt: "2025-08-19T14:30:00Z",
      status: "In-Progress",
      progress: 78,
      priority: "Medium",
      etaMinutes: 120,
      assignedNgo: {
        id: "ngo-15",
        name: "Green Trackers",
        logo: "/logos/green.png",
      },
      lastUpdate: {
        time: "2025-08-21T08:30:00Z",
        message: "Site assessment in progress",
      },
      updates: [
        { time: "2025-08-21T08:30:00Z", message: "Site assessment in progress" },
        { time: "2025-08-20T16:00:00Z", message: "Field team deployed" },
        { time: "2025-08-19T15:00:00Z", message: "Report verified and prioritized" },
      ],
      evidence: [
        { id: "f3", type: "image", url: "/mock/3.jpg" },
        { id: "f4", type: "video", url: "/mock/4.mp4" },
      ],
    },
    {
      id: "WW-9J4L5C",
      threatType: "Wildlife Trafficking",
      locationText: "Highway Checkpoint, Mile 15",
      coords: { lat: 12.789, lng: 77.4567 },
      createdAt: "2025-08-18T11:15:00Z",
      status: "Resolved",
      progress: 100,
      priority: "Critical",
      assignedNgo: {
        id: "ngo-08",
        name: "Wildlife Rescue",
        logo: "/logos/rescue.png",
      },
      lastUpdate: {
        time: "2025-08-20T20:45:00Z",
        message: "Case closed - suspects apprehended",
      },
      updates: [
        { time: "2025-08-20T20:45:00Z", message: "Case closed - suspects apprehended" },
        { time: "2025-08-19T22:00:00Z", message: "Law enforcement coordinated" },
        { time: "2025-08-18T12:00:00Z", message: "Emergency response activated" },
      ],
      evidence: [
        { id: "f5", type: "image", url: "/mock/5.jpg" },
        { id: "f6", type: "audio", url: "/mock/6.mp3" },
        { id: "f7", type: "video", url: "/mock/7.mp4" },
      ],
    },
  ]

  return NextResponse.json(reports)
}
