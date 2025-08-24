import os
import sys
sys.path.append('../agent')
import json
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

from flask import Flask, request, jsonify, Response
from typing import Optional
import subprocess
import sys
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

# ------------------ Webcam MJPEG Stream ------------------
try:
    import cv2  # type: ignore
    _cv2_ok = True
except Exception:
    cv2 = None  # type: ignore
    _cv2_ok = False

_webcam_cap = None  # lazy-initialized capture
_webcam_proc: Optional[subprocess.Popen] = None  # external webcam.py process

# Optional YOLO detection for MJPEG stream
try:
    from ultralytics import YOLO  # type: ignore
    _ultra_ok = True
except Exception:
    YOLO = None  # type: ignore
    _ultra_ok = False

_yolo_model = None
_detect_every_n = 2
_frame_index = 0
_det_counts: dict[str, int] = {}
_session_start_ts: Optional[float] = None

def _get_webcam_cap():
    global _webcam_cap
    if _webcam_cap is None and _cv2_ok:
        _webcam_cap = cv2.VideoCapture(0)
        # Try setting a sane resolution
        try:
            _webcam_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            _webcam_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        except Exception:
            pass
    return _webcam_cap

def _generate_mjpeg():
    import time
    global _yolo_model, _frame_index, _det_counts, _session_start_ts
    cap = _get_webcam_cap()
    if not _cv2_ok or cap is None or not cap.isOpened():
        # yield a single empty frame notice
        msg = b"--frame\r\nContent-Type: text/plain\r\n\r\nWebcam unavailable\r\n"
        yield msg
        return
    if _session_start_ts is None:
        _session_start_ts = time.time()
        _det_counts = {}
        _frame_index = 0
    if _ultra_ok and _yolo_model is None:
        try:
            _yolo_model = YOLO('yolov8n.pt')
        except Exception:
            _yolo_model = None
    while True:
        success, frame = cap.read()
        if not success:
            break
        _frame_index += 1
        # Optionally run detection every N frames
        if _yolo_model is not None and _frame_index % _detect_every_n == 0:
            try:
                results = _yolo_model(frame, verbose=False, imgsz=640)
                for r in results:
                    names = r.names if hasattr(r, 'names') else {}
                    if getattr(r, 'boxes', None) is not None:
                        for b in r.boxes:
                            try:
                                x1, y1, x2, y2 = map(int, b.xyxy[0].cpu().numpy())
                                conf = float(b.conf[0].cpu().numpy())
                                cls_id = int(b.cls[0].cpu().numpy())
                                label = names.get(cls_id, str(cls_id))
                                # Count label
                                _det_counts[label] = _det_counts.get(label, 0) + 1
                                # Draw box
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                txt = f"{label} {conf:.2f}"
                                cv2.putText(frame, txt, (x1, max(0, y1-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1)
                            except Exception:
                                continue
            except Exception:
                pass
        # Encode to JPEG
        ret, buf = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        jpg = buf.tobytes()
        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n")

@app.get('/webcam/start')
def webcam_start() -> Any:
    cap = _get_webcam_cap()
    ok = _cv2_ok and cap is not None and cap.isOpened()
    return jsonify({"ok": ok})

@app.get('/webcam/stream')
def webcam_stream():
    return Response(_generate_mjpeg(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.post('/webcam/start_script')
def webcam_start_script() -> Any:
    """Start external Python webcam script (agent/webcam.py) using a command string."""
    global _webcam_proc
    try:
        if _webcam_proc and _webcam_proc.poll() is None:
            return jsonify({"ok": True, "message": "webcam.py already running"})
        # Start detection/webcam.py (not agent)
        script_path = Path(__file__).resolve().parents[1] / 'detection' / 'webcam.py'
        if not script_path.exists():
            # If webcam.py not present, report gracefully
            return jsonify({"ok": False, "error": f"webcam.py not found at {str(script_path)}"}), 404
        # Build command string (works on Windows and Unix)
        python_exe = sys.executable or 'python'
        cmd = f'"{python_exe}" "{str(script_path)}"'
        _webcam_proc = subprocess.Popen(cmd, shell=True)
        return jsonify({"ok": True, "pid": _webcam_proc.pid})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.post('/webcam/stop_script')
def webcam_stop_script() -> Any:
    """Stop external webcam.py if running."""
    global _webcam_proc
    try:
        if _webcam_proc and _webcam_proc.poll() is None:
            _webcam_proc.terminate()
            _webcam_proc = None
            return jsonify({"ok": True, "message": "stopped"})
        return jsonify({"ok": True, "message": "not running"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.get('/webcam/summary')
def webcam_summary() -> Any:
    import time
    return jsonify({
        "session_info": {
            "start_time": _session_start_ts or time.time(),
            "end_time": time.time(),
            "total_events": sum(_det_counts.values())
        },
        "events": [
            {
                "event": "periodic_status",
                "timestamp": time.time(),
                "detection_results": {
                    "total_detections": sum(_det_counts.values()),
                    "all_animals": [
                        {"animal": k, "count": v, "percentage": (v / max(1, sum(_det_counts.values())))*100}
                        for k, v in sorted(_det_counts.items(), key=lambda x: x[1], reverse=True)
                    ]
                }
            }
        ]
    })

if __name__ == "__main__":
    print(f"🚀 Starting Wildlife Detection API Server")
    print(f"📁 Detect.py path: {DETECT_PATH}")
    print(f"🌐 Server running on http://localhost:5002")
    print(f"🔧 Health check at http://localhost:5002/health")
    
    from waitress import serve
    serve(app, host="localhost", port=5002)