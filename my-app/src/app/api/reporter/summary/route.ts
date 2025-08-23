import { NextResponse } from "next/server"

export async function GET() {
  // Mock data for citizen dashboard summary
  const summary = {
    openCount: 3,
    resolvedCount: 12,
    avgResponseMinutes: 178,
    priorityBreakdown: {
      low: 5,
      medium: 6,
      high: 3,
      critical: 1,
    },
  }

  return NextResponse.json(summary)
}
