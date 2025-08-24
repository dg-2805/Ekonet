import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
export const runtime = 'nodejs';

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface ThreatFormData {
  threatType: string;
  location: string;
  threatDescription: string;
  coordinates: {
    latitude: number | null;
    longitude: number | null;
  };
  locationMethod: "current" | "manual" | "map" | "";
  images: UploadedFile[];
  videos: UploadedFile[];
  audio: UploadedFile[];
  isAnonymous: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: "image" | "video" | "audio";
  url: string;
  file: File;
  isAnalyzing: boolean;
  analysisResult?: any;
  analysisError?: string;
}

interface ReportAnalysis {
  species: {
    scientific_name: string;
    genus: string;
    species_epithet: string;
    subspecies: string | null;
    common_name: string;
    other_common_names: string[];
    confidence: number;
    taxonomy: {
      class: string;
      order: string;
      family: string;
    };
    distinguishing_features: string[];
    similar_candidates: Array<{
      scientific_name: string;
      common_name: string;
      confidence: number;
      why_not: string;
    }>;
  };
  conservation: {
    iucn_status: string;
    protected_status: string;
  };
  danger_profile: {
    is_venomous: boolean;
    is_poisonous: boolean;
    toxicity_level: any;
    primary_toxins: string[];
    threat_to_humans: string;
    evidence: string;
  };
  health_indicators: {
    age_sex: any;
    visible_injuries: string[];
    condition: string;
  };
  habitat_context: {
    environment: string;
    human_impact: any;
  };
  threat_analysis: {
    illegal_activity_detected: boolean;
    evidence: string[];
    weapons_traps: string[];
    suspicious_activity: string[];
  };
  risk_assessment: {
    level: number;
    justification: string;
    urgency: string;
  };
  recommended_actions: string[];
  metadata: {
    analysis_type: string;
    timestamp: Date;
    source: string;
    model: string;
    universal_detector: {
      detected_file_type: string;
      analysis_timestamp: Date;
      file_info: {
        path: string;
        name: string;
        size_bytes: number;
        size_mb: number;
        extension: string;
        created: Date;
        modified: Date;
      };
      version: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form fields
    const threatType = formData.get('threatType') as string;
    const location = formData.get('location') as string;
    const threatDescription = formData.get('threatDescription') as string;
    const coordinates = JSON.parse(formData.get('coordinates') as string);
    const locationMethod = formData.get('locationMethod') as string;
    const isAnonymous = formData.get('isAnonymous') === 'true';
    const reporterName = (formData.get('reporterName') as string) || '';
    
    // Get files (optional)
    const files = formData.getAll('files') as File[];
    const validFiles = files.filter(file => file && file.size > 0);
    
    // Create the full payload
    const fullPayload = {
      formData: {
        threatType,
        location,
        threatDescription,
        coordinates,
        locationMethod,
        isAnonymous,
        timestamp: new Date().toISOString(),
        reportId: `WW-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      },
      files: validFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
      context: {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        timestamp: new Date().toISOString(),
      }
    };

    // Console log the full payload
    console.log('🚀 FULL FORM PAYLOAD SENT TO AI AGENT:');
    console.log(JSON.stringify(fullPayload, null, 2));
    
    // Detailed logging of each field
    console.log('\n📋 DETAILED FORM DATA BREAKDOWN:');
    console.log('=====================================');
    console.log(`📍 Location: "${location}"`);
    console.log(`📝 Threat Description: "${threatDescription}"`);
    console.log(`⚠️  Threat Type: "${threatType}"`);
    console.log(`🗺️  Coordinates: ${JSON.stringify(coordinates, null, 2)}`);
    console.log(`📍 Location Method: "${locationMethod}"`);
    console.log(`👤 Anonymous: ${isAnonymous}`);
    console.log(`🆔 Report ID: "${fullPayload.formData.reportId}"`);
    console.log(`⏰ Timestamp: "${fullPayload.formData.timestamp}"`);
    
         console.log('\n📁 FILES BEING SENT:');
     console.log('====================');
     if (validFiles.length > 0) {
       validFiles.forEach((file, index) => {
         console.log(`File ${index + 1}:`);
         console.log(`  📄 Name: "${file.name}"`);
         console.log(`  📏 Size: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
         console.log(`  🏷️  Type: "${file.type}"`);
         console.log(`  📅 Last Modified: ${new Date(file.lastModified).toISOString()}`);
       });
     } else {
       console.log('No files uploaded (optional)');
     }
    
    console.log('\n🌐 REQUEST CONTEXT:');
    console.log('==================');
    console.log(`🌍 User Agent: "${fullPayload.context.userAgent}"`);
    console.log(`🌐 IP Address: "${fullPayload.context.ip}"`);
    console.log(`⏰ Request Timestamp: "${fullPayload.context.timestamp}"`);

    // Send to backend AI agent
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
    
    // Create FormData for backend
    const backendFormData = new FormData();
    
         // Add files (if any)
     validFiles.forEach(file => {
       backendFormData.append('files', file);
     });
    
    // Add context information
    backendFormData.append('location', location);
    backendFormData.append('description', threatDescription);
    backendFormData.append('threatType', threatType);
    backendFormData.append('coordinates', JSON.stringify(coordinates));
    backendFormData.append('locationMethod', locationMethod);
    backendFormData.append('isAnonymous', isAnonymous.toString());
    backendFormData.append('reportId', fullPayload.formData.reportId);
    backendFormData.append('timestamp', fullPayload.formData.timestamp);
    backendFormData.append('evidenceCount', String(validFiles.length));
    if (reporterName) backendFormData.append('reporterName', reporterName);

    // Send to backend
    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      throw new Error(`Backend analysis failed: ${response.statusText}`);
    }

    const analysisResults = await response.json();
    
    // Create the final report structure matching the Report model
    const reportData: ReportAnalysis = {
      species: {
        scientific_name: "",
        genus: "",
        species_epithet: "",
        subspecies: null,
        common_name: "",
        other_common_names: [],
        confidence: 0,
        taxonomy: {
          class: "",
          order: "",
          family: "",
        },
        distinguishing_features: [],
        similar_candidates: [],
      },
      conservation: {
        iucn_status: "",
        protected_status: "",
      },
      danger_profile: {
        is_venomous: false,
        is_poisonous: false,
        toxicity_level: null,
        primary_toxins: [],
        threat_to_humans: "",
        evidence: "",
      },
      health_indicators: {
        age_sex: null,
        visible_injuries: [],
        condition: "",
      },
      habitat_context: {
        environment: "",
        human_impact: null,
      },
      threat_analysis: {
        illegal_activity_detected: false,
        evidence: [],
        weapons_traps: [],
        suspicious_activity: [],
      },
      risk_assessment: {
        level: 1,
        justification: "",
        urgency: "Low",
      },
      recommended_actions: [],
      metadata: {
        analysis_type: "combined",
        timestamp: new Date(),
        source: "user_upload",
        model: "gemini-2.5-flash",
        universal_detector: {
          detected_file_type: "multiple",
          analysis_timestamp: new Date(),
          file_info: {
            path: "",
            name: "",
            size_bytes: 0,
            size_mb: 0,
            extension: "",
            created: new Date(),
            modified: new Date(),
          },
          version: "1.0.0",
        },
      },
    };

    // Merge AI analysis results if available
    if (analysisResults.results && analysisResults.results.length > 0) {
      const firstResult = analysisResults.results[0];
      if (firstResult.analysis_result) {
        // Merge the AI analysis with our report structure
        Object.assign(reportData, firstResult.analysis_result);
      }
    }

    // Save AI analysis JSON(s) to MongoDB (collection: report-analysis)
    let mongoSaveSummary: { savedCount: number; ids: string[] } = { savedCount: 0, ids: [] };
    let nearestNgos: Array<{ id: string; orgName?: string; email?: string; location?: string; distanceKm: number }> = [];
    try {
      const client = await connectToDatabase();
      const db = client.db();

      // Compute nearest NGOs if coordinates provided
      const lat = Number(coordinates?.latitude);
      const lon = Number(coordinates?.longitude);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
      let assignedNgoId: string | null = null;
      let assignedNgoDistanceKm: number | null = null;
      if (hasCoords) {
        const ngoDocs = await db.collection('users')
          .find({ role: 'ngo', 'locationCoords.lat': { $ne: null }, 'locationCoords.lng': { $ne: null } }, { projection: { orgName: 1, email: 1, location: 1, locationCoords: 1 } })
          .toArray();
        const withDistance = ngoDocs
          .map((ngo: any) => {
            const nlat = Number(ngo?.locationCoords?.lat);
            const nlon = Number(ngo?.locationCoords?.lng);
            if (!Number.isFinite(nlat) || !Number.isFinite(nlon)) return null;
            const distanceKm = haversineDistanceKm(lat, lon, nlat, nlon);
            return { id: String(ngo._id), orgName: ngo.orgName, email: ngo.email, location: ngo.location, distanceKm };
          })
          .filter(Boolean) as Array<{ id: string; orgName?: string; email?: string; location?: string; distanceKm: number }>;
        withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
        nearestNgos = withDistance.slice(0, 2);
        if (withDistance.length > 0) {
          assignedNgoId = withDistance[0].id;
          assignedNgoDistanceKm = withDistance[0].distanceKm;
        }
      }

      // Save analysis results, tagging assignment to the single nearest NGO
      const collection = db.collection('report-analysis');
      const ids: string[] = [];
      if (analysisResults.results && analysisResults.results.length > 0) {
        for (const r of analysisResults.results) {
          if (r.analysis_result) {
            const toSave = {
              ...r.analysis_result,
              assignedNgoId: assignedNgoId || null,
              assignedNgoDistanceKm: assignedNgoDistanceKm ?? null,
              reporter_name: reporterName || undefined,
            };
            const saved = await collection.insertOne(toSave);
            ids.push(String(saved.insertedId));
          }
        }
      } else if (reportData) {
        const toSave = {
          ...reportData as any,
          assignedNgoId: assignedNgoId || null,
          assignedNgoDistanceKm: assignedNgoDistanceKm ?? null,
          reporter_name: reporterName || undefined,
        };
        const saved = await collection.insertOne(toSave);
        ids.push(String(saved.insertedId));
      }
      mongoSaveSummary = { savedCount: ids.length, ids };
    } catch (mongoErr) {
      console.error('❌ Failed to save AI analysis or find NGOs:', mongoErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: fullPayload.formData.reportId,
      analysisResults,
      reportData,
      mongoSaveSummary,
      nearestNgos,
      fullPayload, // Include the full payload in response for debugging
    });

  } catch (error) {
    console.error('❌ Error in agent API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const ngoId = searchParams.get('ngoId');
    const limit = Math.max(1, Math.min(500, Number(limitParam) || 50));

    const client = await connectToDatabase();
    const db = client.db();
    const collection = db.collection('report-analysis');

    const query: any = {};
    if (ngoId) {
      query.assignedNgoId = ngoId;
    }

    const items = await collection
      .find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error('❌ Error fetching report-analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}