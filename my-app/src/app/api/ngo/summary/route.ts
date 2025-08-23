import { NextResponse } from "next/server"

export async function GET() {
  // Mock data for NGO dashboard summary
  const summary = {
    openIncidents: 18,
    slaBreaches24h: 3,
    avgTriageMinutes: 46,
    donationsToday: 1250,
    trend: [10, 12, 9, 14, 18, 16, 20],
    ngoName: "Wildlife Shield Foundation",
    ngoLocation: "Central India Region"
  }

  return NextResponse.json(summary)
}
