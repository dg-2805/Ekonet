import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const client = await connectToDatabase();
    const db = client.db();
    const collection = db.collection('report-analysis');

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const skip = Math.max(0, parseInt(searchParams.get('skip') || '0'));

    const docs = await collection
      .find({})
      .sort({ 'metadata.timestamp': -1, timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Convert ObjectId to string for readability in client console logs
    const serialized = docs.map((d: any) => ({
      ...d,
      _id: d?._id?.toString?.() || d._id,
    }));

    // Console log fetched documents on the server
    console.log('📥 [GET /api/report-analysis] fetched documents:', {
      count: docs.length,
      skip,
      limit,
    });
    if (serialized.length > 0) {
      // Log a readable preview to avoid flooding logs
      console.log(
        JSON.stringify(
          serialized.map((d) => ({ _id: d._id, species: d.species?.common_name || d.species?.scientific_name, risk: d.risk_assessment })),
          null,
          2,
        ),
      );
    }

    return NextResponse.json({ success: true, count: serialized.length, items: serialized });
  } catch (error) {
    console.error('❌ Failed to fetch report-analysis documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}


