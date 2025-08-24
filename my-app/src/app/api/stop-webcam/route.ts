import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Extend globalThis to include webcamProcessRef
declare global {
  // Replace 'any' with the actual type if known, otherwise keep 'any'
  var webcamProcessRef: any;
}

// Use a global variable to track the process (must match start-webcam)
let processRef: any = globalThis.webcamProcessRef;

export async function POST() {
  try {
    if (processRef && !processRef.killed) {
      const pid = processRef.pid;
      processRef.kill('SIGINT'); // Send Ctrl+C equivalent so Python writes summary
      processRef = null;
      globalThis.webcamProcessRef = null;
      // Wait (poll) up to 2s for output.json to include final_summary
      const outputPath = path.resolve(process.cwd(), '../../detection/output.json');
      let data: any = null;
      const start = Date.now();
      while (Date.now() - start < 2000) {
        try {
          if (fs.existsSync(outputPath)) {
            const raw = fs.readFileSync(outputPath, 'utf-8');
            data = JSON.parse(raw);
            const hasFinal = Array.isArray(data?.events) && data.events.some((e: any) => e.event === 'final_summary');
            if (hasFinal) break;
          }
        } catch {}
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); // sleep ~100ms
      }
      return NextResponse.json({ status: 'stopped', pid, output: data });
    } else {
      return NextResponse.json({ status: 'not running' });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Could not stop webcam.py', details: String(err) }, { status: 500 });
  }
}
