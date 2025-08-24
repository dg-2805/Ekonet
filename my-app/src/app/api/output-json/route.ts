import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readFirstExisting(paths: string[]) {
  for (const p of paths) {
    try {
      const data = await fs.readFile(p, 'utf-8')
      return { data, path: p }
    } catch (_) {
      // continue
    }
  }
  throw new Error('output.json not found in expected locations')
}

export async function GET() {
  try {
    const cwd = process.cwd()
    const candidates = [
      path.resolve(cwd, '..', 'detection', 'output.json'),
      path.resolve(cwd, 'detection', 'output.json'),
      path.resolve(cwd, '..', '..', 'detection', 'output.json'),
    ]
    const { data, path: used } = await readFirstExisting(candidates)
    const json = JSON.parse(data)
    return NextResponse.json(json, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'X-Output-Path': used,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to read output.json' }, { status: 500 })
  }
}


