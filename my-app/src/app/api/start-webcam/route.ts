import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

let processRef: any = null;

export async function POST() {
  try {
    // If already running, do not start again
    if (processRef && !processRef.killed) {
      return NextResponse.json({ status: 'already running' });
    }
    // Path to webcam.py
    const scriptPath = path.resolve(process.cwd(), '../../detection/webcam.py');
    // Start the Python process
    processRef = spawn('python', [scriptPath], {
      detached: true,
      stdio: 'ignore',
    });
    return NextResponse.json({ status: 'started' });
  } catch (err) {
    return NextResponse.json({ error: 'Could not start webcam.py', details: String(err) }, { status: 500 });
  }
}
