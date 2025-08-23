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

    const filter: any = {}
    if (reporterName) filter.reporter_name = reporterName

    const [openCount, resolvedCount, priorityAgg] = await Promise.all([
      col.countDocuments({ ...filter, status: { $ne: 'Resolved' } }),
      col.countDocuments({ ...filter, status: 'Resolved' }),
      col.aggregate([
        { $match: filter },
        { $group: { _id: '$risk_assessment.urgency', count: { $sum: 1 } } }
      ]).toArray()
    ])

    // Placeholder average for now; compute if resolution timestamps are later persisted
    const avgResponseMinutes = 46

    const priorityBreakdown = { low: 0, medium: 0, high: 0, critical: 0 }
    for (const p of priorityAgg) {
      const key = String(p._id || '').toLowerCase()
      if (key === 'low') priorityBreakdown.low = p.count
      else if (key === 'medium' || key === 'moderate') priorityBreakdown.medium = p.count
      else if (key === 'high') priorityBreakdown.high = p.count
      else if (key === 'critical' || key === 'emergency') priorityBreakdown.critical = p.count
    }

    return NextResponse.json({
      openCount,
      resolvedCount,
      avgResponseMinutes,
      priorityBreakdown
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
