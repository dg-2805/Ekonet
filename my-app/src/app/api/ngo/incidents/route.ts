import { NextResponse } from "next/server"

export async function GET() {
  // Mock data for NGO incidents
  const incidents = {
    items: [
      {
        id: "WW-7G2H9A",
        reportedAt: "2025-08-20T09:21:00Z",
        type: "Poaching",
        location: "River Bend, Sector 5",
        priority: "High",
        status: "Triaged",
        evidenceCount: 3,
        anonymous: true,
        aiScore: 82,
      },
      {
        id: "WW-8H3K2B",
        reportedAt: "2025-08-19T14:30:00Z",
        type: "Habitat Destruction",
        location: "Forest Edge, Zone 3",
        priority: "Medium",
        status: "Assigned",
        evidenceCount: 2,
        anonymous: false,
        aiScore: 67,
      },
      {
        id: "WW-9J4L5C",
        reportedAt: "2025-08-18T11:15:00Z",
        type: "Wildlife Trafficking",
        location: "Highway Checkpoint, Mile 15",
        priority: "Critical",
        status: "In-Progress",
        evidenceCount: 4,
        anonymous: true,
        aiScore: 95,
      },
      {
        id: "WW-1A2B3C",
        reportedAt: "2025-08-21T16:45:00Z",
        type: "Illegal Logging",
        location: "Protected Reserve, North",
        priority: "High",
        status: "New",
        evidenceCount: 1,
        anonymous: false,
        aiScore: 78,
      },
      {
        id: "WW-4D5E6F",
        reportedAt: "2025-08-21T13:20:00Z",
        type: "Animal Cruelty",
        location: "Village Outskirts, East",
        priority: "Medium",
        status: "Triaged",
        evidenceCount: 2,
        anonymous: true,
        aiScore: 54,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 128,
  }

  return NextResponse.json(incidents)
}
