import os
import sys
import json
import tempfile
from pathlib import Path
from typing import List, Dict, Any

from flask import Flask, request, jsonify
from flask_cors import CORS

# Add the specific path to your detect.py
DETECT_PATH = "C:/Users/daria/Documents/SC2/Ekonet/agent"
sys.path.append(DETECT_PATH)

try:
    from detect import UniversalDetector  # type: ignore
    print("✅ Successfully imported UniversalDetector from detect.py")
except Exception as import_err:
    UniversalDetector = None  # type: ignore
    _import_error_message = str(import_err)
    print(f"❌ Failed to import UniversalDetector: {_import_error_message}")

app = Flask(__name__)
CORS(app, resources={r"*": {"origins": ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"]}})

@app.get("/")
def root() -> Any:
    return jsonify({"status": "ok", "service": "wildwatch-detect", "detect_path": DETECT_PATH})

@app.get("/health")
def health() -> Any:
    ok = UniversalDetector is not None
    return jsonify({"ok": ok, "details": None if ok else _import_error_message}), (200 if ok else 500)

def _analyze_file(temp_path: Path) -> Dict[str, Any]:
    """Call UniversalDetector from detect.py to analyze a single file path."""
    if UniversalDetector is None:
        raise RuntimeError(f"Failed to import detect.py: {_import_error_message}")

    detector = UniversalDetector()
    return detector.analyze(str(temp_path))

@app.post("/analyze")
def analyze() -> Any:
    if "files" not in request.files:
        return jsonify({"message": "No files part in form-data (use key 'files')"}), 400

    uploaded_files = request.files.getlist("files")
    if not uploaded_files:
        return jsonify({"message": "No files provided"}), 400

    results: List[Dict[str, Any]] = []

    for f in uploaded_files:
        if not f or f.filename == '':
            continue
            
        # Get file extension
        file_ext = Path(f.filename).suffix
        
        # Create temporary file with proper extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            f.save(tmp.name)
            tmp_path = Path(tmp.name)

        try:
            print(f"📥 Saved upload to temp path: {tmp_path}")
            analysis = _analyze_file(tmp_path)
            print(f"✅ Analysis successful for {f.filename}")
            
            # Generate output filename for saving JSON
            original_name = Path(f.filename).stem
            output_path = f"C:/Users/daria/Documents/SC2/Ekonet/backend/{original_name}_analysis.json"

            # Save the analysis results to a JSON file
            if UniversalDetector is not None:
                detector = UniversalDetector()
                detector.save_results(analysis, output_path)
                print(f"💾 Saved analysis to: {output_path}")
            
            results.append({
                "original_filename": f.filename,
                "content_type": f.mimetype,
                "file_size": os.path.getsize(tmp_path),
                "analysis_result": analysis,
                "saved_json_path": output_path
            })
        except Exception as e:
            print(f"❌ Analysis failed for {f.filename}: {e}")
            results.append({
                "original_filename": f.filename,
                "content_type": f.mimetype,
                "error": str(e),
            })
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return jsonify({
        "message": "analysis complete", 
        "files_analyzed": len(results), 
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