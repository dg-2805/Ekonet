import os
import sys
import json
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS

# Add the specific path to your detect.py
DETECT_PATH = "C:/PROJECTS/StatusCode2/Ekonet/agent"
sys.path.append(DETECT_PATH)

try:
    from detect import UniversalDetector  # type: ignore
    print("✅ Successfully imported UniversalDetector from detect.py")
except Exception as import_err:
    UniversalDetector = None  # type: ignore
    _import_error_message = str(import_err)
    print(f"❌ Failed to import UniversalDetector: {_import_error_message}")

# Try import VideoAnalyzer for video handling
try:
    from video2 import VideoAnalyzer  # type: ignore
    _video2_ok = True
except Exception as _ve:
    VideoAnalyzer = None  # type: ignore
    _video2_ok = False
    print(f"⚠️ Could not import video2.VideoAnalyzer: {_ve}")

app = Flask(__name__)
CORS(app, resources={r"*": {"origins": ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"]}})

@app.get("/")
def root() -> Any:
    return jsonify({"status": "ok", "service": "wildwatch-detect", "detect_path": DETECT_PATH})

@app.get("/health")
def health() -> Any:
    ok = UniversalDetector is not None
    return jsonify({"ok": ok, "details": None if ok else _import_error_message}), (200 if ok else 500)

def _analyze_file_with_context(temp_path: Path, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Analyze file with context using UniversalDetector."""
    if UniversalDetector is None:
        raise RuntimeError(f"Failed to import detect.py: {_import_error_message}")

    detector = UniversalDetector()
    return detector.analyze_with_context(str(temp_path), context)

def _analyze_text_with_context(description: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Analyze text description with context using AI for threat assessment."""
    if UniversalDetector is None:
        raise RuntimeError(f"Failed to import detect.py: {_import_error_message}")

    detector = UniversalDetector()
    return detector.analyze_text_with_context(description, context)

@app.post("/analyze")
def analyze() -> Any:
    """
    Unified analysis endpoint that handles both text-only and file+context analysis
    """
    # Get form data (always required)
    location = request.form.get('location', '')
    description = request.form.get('description', '')
    threat_type = request.form.get('threatType', '')
    coordinates = request.form.get('coordinates', '{}')
    location_method = request.form.get('locationMethod', '')
    is_anonymous = request.form.get('isAnonymous', 'false')
    report_id = request.form.get('reportId', '')
    timestamp = request.form.get('timestamp', '')
    evidence_count = request.form.get('evidenceCount', None)
    reporter_name = request.form.get('reporterName', '')

    # Check if files were uploaded (optional)
    uploaded_files = []
    if "files" in request.files:
        uploaded_files = request.files.getlist("files")
        # Filter out empty files
        uploaded_files = [f for f in uploaded_files if f and f.filename != '']

    # Create unified context for all analysis
    analysis_context = {
        'location': location,
        'description': description,
        'threat_type': threat_type,
        'coordinates': coordinates,
        'location_method': location_method,
        'is_anonymous': is_anonymous,
        'report_id': report_id,
        'timestamp': timestamp,
        'evidence_count': int(evidence_count) if evidence_count is not None and str(evidence_count).isdigit() else None,
        'reporter_name': reporter_name or 'anonymous'
    }

    print(f"🔍 AI Agent analyzing: {len(uploaded_files)} file(s) + context")

    results: List[Dict[str, Any]] = []

    if uploaded_files:
        # File + Context Analysis
        for f in uploaded_files:
            if not f or f.filename == '':
                continue
            
            print(f"📄 Analyzing file: {f.filename}")
            
            original_name = Path(f.filename).stem
            output_path = f"C:/PROJECTS/StatusCode2/Ekonet/backend/{original_name}_analysis.json"

            is_video = (f.mimetype or '').startswith('video')

            tmp_path: Optional[Path] = None
            try:
                if is_video and VideoAnalyzer is not None and _video2_ok:
                    # Read uploaded bytes directly, prefer context-aware API
                    raw_bytes = f.read()
                    analyzer = VideoAnalyzer()
                    if hasattr(analyzer, 'analyze_with_context'):
                        analysis = analyzer.analyze_with_context(
                            raw_bytes,
                            analysis_context,
                            mime_type=f.mimetype,
                            filename=f.filename,
                        )
                        file_size_val = len(raw_bytes) if raw_bytes is not None else None
                        source_label = "uploaded_bytes"
                    else:
                        # Fallback to temp-file path based analysis
                        file_ext = Path(f.filename).suffix
                        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
                            tmp.write(raw_bytes)
                            tmp.flush()
                            tmp_path = Path(tmp.name)
                        analysis = analyzer.analyze(str(tmp_path))
                        file_size_val = os.path.getsize(tmp_path)
                        source_label = str(tmp_path)
                else:
                    # For images and non-video types: save to temp and analyze
                    file_ext = Path(f.filename).suffix
                    with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
                        f.save(tmp.name)
                        tmp_path = Path(tmp.name)
                    analysis = _analyze_file_with_context(tmp_path, analysis_context)
                    file_size_val = os.path.getsize(tmp_path)
                    source_label = str(tmp_path)
                
                # Save results
                if UniversalDetector is not None:
                    try:
                        detector = UniversalDetector()
                        detector.save_results(analysis, output_path)
                    except Exception:
                        # Fallback simple save
                        with open(output_path, 'w') as out_f:
                            json.dump(analysis, out_f, indent=2)
                else:
                    # Save directly if detector not available
                    with open(output_path, 'w') as out_f:
                        json.dump(analysis, out_f, indent=2)
                print(f"✅ Generated report: {original_name}_analysis.json")
                
                results.append({
                    "analysis_type": "file_with_context",
                    "original_filename": f.filename,
                    "content_type": f.mimetype,
                    "file_size": file_size_val,
                    "analysis_result": analysis,
                    "saved_json_path": output_path,
                    "context_used": analysis_context,
                    "source": source_label,
                })
                
            except Exception as e:
                print(f"❌ Analysis failed for {f.filename}: {e}")
                results.append({
                    "analysis_type": "file_with_context",
                    "original_filename": f.filename,
                    "content_type": f.mimetype,
                    "error": str(e),
                    "context_used": analysis_context
                })
            finally:
                # Clean up temp file if created
                if tmp_path is not None:
                    try:
                        os.unlink(tmp_path)
                    except OSError:
                        pass
    else:
        # Text-Only Analysis
        print(f"📝 Analyzing text description")
        
        try:
            # Analyze text description with context
            text_analysis = _analyze_text_with_context(description, analysis_context)
            
            # Generate output filename
            output_path = f"C:/PROJECTS/StatusCode2/Ekonet/backend/text_report_{report_id}_analysis.json"
            
            # Save results
            if UniversalDetector is not None:
                detector = UniversalDetector()
                detector.save_results(text_analysis, output_path)
                print(f"✅ Generated report: text_report_{report_id}_analysis.json")
            
            results.append({
                "analysis_type": "text_only",
                "location": location,
                "description": description,
                "threat_type": threat_type,
                "coordinates": coordinates,
                "location_method": location_method,
                "is_anonymous": is_anonymous,
                "report_id": report_id,
                "timestamp": timestamp,
                "analysis_result": text_analysis,
                "saved_json_path": output_path,
                "context_used": analysis_context,
                "message": "Text-only report analyzed successfully"
            })
            
        except Exception as e:
            print(f"❌ Text analysis failed: {e}")
            results.append({
                "analysis_type": "text_only",
                "location": location,
                "description": description,
                "threat_type": threat_type,
                "coordinates": coordinates,
                "location_method": location_method,
                "is_anonymous": is_anonymous,
                "report_id": report_id,
                "timestamp": timestamp,
                "error": str(e),
                "context_used": analysis_context,
                "message": "Text analysis failed"
            })

    # Return unified response
    files_analyzed = len([r for r in results if r.get("analysis_type") == "file_with_context"])
    text_analyzed = len([r for r in results if r.get("analysis_type") == "text_only"])
    
    return jsonify({
        "message": "unified analysis complete",
        "files_analyzed": files_analyzed,
        "text_only_reports": text_analyzed,
        "total_analyses": len(results),
        "results": results
    })

# Endpoint to get a saved analysis file
@app.get("/get-analysis/<filename>")
def get_analysis(filename: str) -> Any:
    file_path = filename
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {str(e)}"}), 500

# Endpoint to list all analysis files
@app.get("/list-analyses")
def list_analyses() -> Any:
    analysis_files = [f for f in os.listdir('.') if f.endswith('_analysis.json')]
    return jsonify({"analysis_files": analysis_files})

if __name__ == "__main__":
    print(f"🚀 Starting Wildlife Detection API Server")
    print(f"📁 Detect.py path: {DETECT_PATH}")
    print(f"🌐 Server running on http://localhost:5002")
    print(f"🔧 Health check at http://localhost:5002/health")
    
    from waitress import serve
    serve(app, host="localhost", port=5002)