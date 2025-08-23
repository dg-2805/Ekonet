import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reporterName = searchParams.get('reporterName')

    const client = await connectToDatabase()
    const db = client.db()
    const col = db.collection('report-analysis')

    const query: any = {}
    if (reporterName) {
      query.reporter_name = reporterName
    }

    const docs = await col
      .find(query)
      .sort({ 'metadata.timestamp': -1, timestamp: -1 })
      .limit(50)
      .toArray()

    const mapUrgencyToPriority = (u?: string) => {
      const k = (u || '').toLowerCase()
      if (k === 'low') return 'Low'
      if (k === 'moderate' || k === 'medium') return 'Medium'
      if (k === 'high') return 'High'
      if (k === 'critical' || k === 'emergency') return 'Critical'
      return 'Low'
    }

    const reports = docs.map((d: any) => {
      const id = String(d._id)
      const threatType = d?.incident
        ? (Object.keys(d.incident).find(k => d.incident[k] === true || String(d.incident[k]).toLowerCase() === 'true')
            || (d.species?.common_name || 'Unknown'))
        : (d.species?.common_name || 'Unknown')
      const locationText = d?.Location || 'Unknown'
      const lat = typeof d?.coordinates?.latitude === 'number' ? d.coordinates.latitude : 0
      const lng = typeof d?.coordinates?.longitude === 'number' ? d.coordinates.longitude : 0
      const createdRaw = d?.metadata?.timestamp || d?.metadata?.universal_detector?.file_info?.created
      const createdAt = createdRaw ? new Date(createdRaw).toISOString() : new Date().toISOString()
      const status = (d?.status || 'Submitted') as 'Submitted' | 'Triaged' | 'Assigned' | 'In-Progress' | 'Resolved'
      const progress = status === 'Resolved' ? 100 : (status === 'In-Progress' ? 60 : (status === 'Assigned' ? 30 : (status === 'Triaged' ? 15 : 5)))
      const priority = mapUrgencyToPriority(d?.risk_assessment?.urgency) as 'Low' | 'Medium' | 'High' | 'Critical'

      return {
        id,
        threatType,
        locationText,
        coords: { lat, lng },
        createdAt,
        status,
        progress,
        priority,
        etaMinutes: status === 'Resolved' ? undefined : 240,
        assignedNgo: undefined,
        lastUpdate: { time: createdAt, message: d?.risk_assessment?.['ai-report'] || 'Report submitted' },
        updates: [{ time: createdAt, message: 'Report submitted' }],
        evidence: []
      }
    })

    return NextResponse.json(reports)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
