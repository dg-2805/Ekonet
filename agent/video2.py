import os
import json
import base64
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Union

from dotenv import load_dotenv
import google.generativeai as genai


# Load environment variables
load_dotenv()


SNAKE_SCHEMA_TEMPLATE: Dict[str, Any] = {
    "species": {
        "scientific_name": "",
        "genus": "",
        "species_epithet": "",
        "subspecies": None,
        "common_name": "",
        "other_common_names": [],
        "confidence": 0,
        "taxonomy": {
            "class": "",
            "order": "",
            "family": "",
        },
        "distinguishing_features": [],
        "similar_candidates": [],
    },
    "conservation": {
        "iucn_status": "",
        "protected_status": "",
    },
    "danger_profile": {
        "is_venomous": None,
        "is_poisonous": None,
        "toxicity_level": None,
        "primary_toxins": [],
        "threat_to_humans": "",
        "evidence": "",
    },
    "health_indicators": {
        "age_sex": None,
        "visible_injuries": [],
        "condition": "",
    },
    "habitat_context": {
        "environment": "",
        "human_impact": None,
    },
    "threat_analysis": {
        "illegal_activity_detected": False,
        "evidence": [],
        "weapons_traps": [],
        "suspicious_activity": [],
    },
    "risk_assessment": {
        "ai-score": "", #out of 10 ( 1 being lowest , 10 being highest) , we are scoring urgency for solution of the report
        "ai-report": "", #a short report based on the (make sure to keep it short 2-3 lines at most that captures the most important information)
        "urgency": "", #Low/Moderate/High/Critical/Emergency
        "evidence_count": None, #integer count of provided in context
    },
    "incident": {  # based on the threatDescription and context , tell me which of the conflict/situations matches the most , give "true" or "false"
        "Anti poaching": "",
        "Human wildlife conflict": "",
        "Medical care": "",
        "Habitat restoration": "",
        "Species recovery": "",
    },
    "Location": "" , #{context.get('location', 'Not provided')}  #fetch from context
    "reporter_name": "",  #Fetched from the context , if not provided , then "anonymous"
    "metadata": {
        "analysis_type": "video",
        "timestamp": "",
        "source": "",
        "model": "gemini-2.5-flash",
        "universal_detector": {
            "detected_file_type": "video",
            "analysis_timestamp": "",
            "file_info": {
                "path": "",
                "name": "",
                "size_bytes": 0,
                "size_mb": 0.0,
                "extension": "",
                "created": "",
                "modified": "",
            },
            "version": "1.0.0",
        },
    },
}


class VideoAnalyzer:
    """
    Analyze videos and return JSON that EXACTLY matches the schema observed in
    backend/snake_analysis.json (same keys, no extras, no omissions).
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(
            "gemini-2.5-flash",
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )

    def analyze_with_context(
        self,
        video_source: Union[str, bytes],
        context: Optional[Dict[str, Any]] = None,
        mime_type: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Accepts a file path or raw bytes and returns JSON matching SNAKE_SCHEMA_TEMPLATE.
        """
        # Load bytes and gather file info
        source_path = "uploaded_bytes"
        raw_bytes: bytes
        try:
            if isinstance(video_source, str):
                source_path = video_source.replace(" ", "")
                with open(source_path, "rb") as f:
                    raw_bytes = f.read()
                if filename is None:
                    filename = Path(source_path).name
            elif isinstance(video_source, (bytes, bytearray)):
                raw_bytes = bytes(video_source)
            else:
                return self._sanitize_result({}, source_path, raw_bytes_len=0, filename=filename, mime_type=mime_type)
        except Exception:
            # On load error, return a sanitized empty shell (no extra keys)
            return self._sanitize_result({}, source_path, raw_bytes_len=0, filename=filename, mime_type=mime_type)

        b64 = base64.b64encode(raw_bytes).decode("utf-8")

        # Build context snippet (used by the model but NOT returned)
        context = context or {}
        context_info = f"""
CONTEXT INFORMATION:
- Location: {context.get('location', 'Not provided')}
- Threat Description: {context.get('description', 'Not provided')}
- Threat Type: {context.get('threat_type', 'Not provided')}
- Coordinates: {context.get('coordinates', 'Not provided')}
- Report ID: {context.get('report_id', 'Not provided')}
- Evidence Count: {context.get('evidence_count', 'Not provided')}
- Reporter Name: {context.get('reporter_name', 'anonymous')}
"""

        # Strict prompt that forces exact schema (no extra keys)
        prompt = f"""
You analyze wildlife threats from video evidence. Use the context to guide risk.
Return ONLY valid JSON that matches EXACTLY this schema (same keys, no extras):
{json.dumps(SNAKE_SCHEMA_TEMPLATE, indent=2)}

Rules:
- Do not add or remove top-level keys.
- Fill values based on the video + context.
- "confidence" should be an integer 0-100; booleans must be true/false strings only if shown so in the template, else real booleans if shown as booleans in the template.
- Keep field names and their nesting identical.

Additional context:
{context_info}
"""

        try:
            response = self.model.generate_content([
                prompt,
                {
                    "mime_type": mime_type or "video/mp4",
                    "data": b64,
                },
            ])
            raw = getattr(response, "text", "") or ""
            model_json = self._extract_json(raw)
        except Exception:
            model_json = {}

        # Sanitize to exact schema, add metadata section at the end
        return self._sanitize_result(
            model_json,
            source_path,
            raw_bytes_len=len(raw_bytes),
            filename=filename,
            mime_type=mime_type,
            context=context,
        )

    def analyze(self, video_path: str) -> Dict[str, Any]:
        """Backwards compatible path-only entrypoint."""
        return self.analyze_with_context(video_path, context=None)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        # Try direct JSON first
        try:
            return json.loads(text)
        except Exception:
            pass
        # Code fence ```json ... ```
        try:
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                if end != -1:
                    return json.loads(text[start:end].strip())
        except Exception:
            pass
        # Greedy object match
        try:
            import re
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                return json.loads(m.group(0))
        except Exception:
            pass
        return {}

    def _sanitize_result(
        self,
        model_json: Dict[str, Any],
        source_path: str,
        raw_bytes_len: int,
        filename: Optional[str],
        mime_type: Optional[str],
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Produce a result that has EXACTLY the keys of SNAKE_SCHEMA_TEMPLATE.
        Unknown/extra keys are dropped. Missing keys are filled with defaults.
        """
        def clone_template(template: Any) -> Any:
            if isinstance(template, dict):
                return {k: clone_template(v) for k, v in template.items()}
            if isinstance(template, list):
                return []
            return template

        result = clone_template(SNAKE_SCHEMA_TEMPLATE)

        # Helper to deep copy allowed fields from model_json into result
        def copy_allowed(dst: Any, src: Any, tmpl: Any) -> None:
            if isinstance(tmpl, dict) and isinstance(src, dict) and isinstance(dst, dict):
                for k in tmpl.keys():
                    if k in src:
                        copy_allowed(dst[k], src[k], tmpl[k])
            elif isinstance(tmpl, list):
                # lists from model_json are accepted as-is (but not nested objects beyond schema types)
                if isinstance(src, list):
                    dst.clear()
                    for item in src:
                        dst.append(item)
            else:
                # primitive
                if src is not None:
                    # Special normalization: risk_assessment fields must be strings/ints as expected
                    dst_type = type(tmpl)
                    try:
                        if dst_type is int:
                            dst_value = int(src) if src != "" else 0
                        elif dst_type is float:
                            dst_value = float(src) if src != "" else 0.0
                        else:
                            dst_value = src
                        return_val = dst_value
                    except Exception:
                        return_val = tmpl
                    # assign
                    nonlocal_assign = return_val
                    # Python scoping: mutate parent container directly
                    # We can't rebind dst here, so set via return
                    return nonlocal_assign

        # Perform a safe copy for known sections
        try:
            if isinstance(model_json, dict):
                # species
                if isinstance(model_json.get("species"), dict):
                    for k in result["species"].keys():
                        if k in model_json["species"]:
                            result["species"][k] = model_json["species"][k]
                # conservation
                if isinstance(model_json.get("conservation"), dict):
                    for k in result["conservation"].keys():
                        if k in model_json["conservation"]:
                            result["conservation"][k] = model_json["conservation"][k]
                # danger_profile
                if isinstance(model_json.get("danger_profile"), dict):
                    for k in result["danger_profile"].keys():
                        if k in model_json["danger_profile"]:
                            result["danger_profile"][k] = model_json["danger_profile"][k]
                # health_indicators
                if isinstance(model_json.get("health_indicators"), dict):
                    for k in result["health_indicators"].keys():
                        if k in model_json["health_indicators"]:
                            result["health_indicators"][k] = model_json["health_indicators"][k]
                # habitat_context
                if isinstance(model_json.get("habitat_context"), dict):
                    for k in result["habitat_context"].keys():
                        if k in model_json["habitat_context"]:
                            result["habitat_context"][k] = model_json["habitat_context"][k]
                # threat_analysis
                if isinstance(model_json.get("threat_analysis"), dict):
                    for k in result["threat_analysis"].keys():
                        if k in model_json["threat_analysis"]:
                            result["threat_analysis"][k] = model_json["threat_analysis"][k]
                # risk_assessment
                if isinstance(model_json.get("risk_assessment"), dict):
                    for k in result["risk_assessment"].keys():
                        if k in model_json["risk_assessment"]:
                            result["risk_assessment"][k] = model_json["risk_assessment"][k]
                # incident
                if isinstance(model_json.get("incident"), dict):
                    for k in result["incident"].keys():
                        if k in model_json["incident"]:
                            result["incident"][k] = model_json["incident"][k]
                # Location
                if isinstance(model_json.get("Location"), str):
                    result["Location"] = model_json["Location"]
                # reporter_name
                if isinstance(model_json.get("reporter_name"), str):
                    result["reporter_name"] = model_json["reporter_name"]
        except Exception:
            # fall back to defaults if mapping fails
            pass

        # Override Location and reporter_name with exact frontend values
        if context:
            if isinstance(context.get("coordinates"), str):
                result["Location"] = context.get("coordinates") or ""
            rn = context.get("reporter_name") or context.get("reporterName")
            if rn is not None:
                result["reporter_name"] = rn or "anonymous"
            # risk_assessment.evidence_count from context if missing
            ra = result.get("risk_assessment", {})
            if ra.get("evidence_count") in (None, ""):
                ec = context.get("evidence_count")
                try:
                    ra["evidence_count"] = int(ec) if ec is not None and str(ec).strip() != "" else None
                except Exception:
                    ra["evidence_count"] = None
                result["risk_assessment"] = ra

        # Build metadata to match snake_analysis.json structure
        now_iso = datetime.now().isoformat()
        file_name = filename or (Path(source_path).name if source_path and source_path != "uploaded_bytes" else "uploaded_video")
        ext = Path(file_name).suffix if file_name else ""
        result["metadata"] = {
            "analysis_type": "video",
            "timestamp": now_iso,
            "source": source_path,
            "model": "gemini-2.5-flash",
            "universal_detector": {
                "detected_file_type": "video",
                "analysis_timestamp": now_iso,
                "file_info": {
                    "path": source_path,
                    "name": file_name,
                    "size_bytes": int(raw_bytes_len or 0),
                    "size_mb": round((raw_bytes_len or 0) / (1024 * 1024), 2),
                    "extension": ext,
                    "created": now_iso,
                    "modified": now_iso,
                },
                "version": "1.0.0",
            },
        }

        return result


# Legacy convenience
def analyze_video(video_path: str) -> Dict[str, Any]:
    analyzer = VideoAnalyzer()
    return analyzer.analyze(video_path)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Analyze a video for wildlife threats (exact JSON schema)")
    parser.add_argument("video", nargs="?", help="Path to the video file to analyze")
    parser.add_argument("--output", "-o", help="Output file path for results")
    args = parser.parse_args()

    if not args.video:
        print("Usage: python agent/video2.py /path/to/video.mp4")
        raise SystemExit(2)

    analyzer = VideoAnalyzer()
    result = analyzer.analyze_with_context(args.video, context=None)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"✅ Results saved to {args.output}")
    else:
        from pprint import pprint
        pprint(result)
import google.generativeai as genai
import base64
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from pprint import pprint
from typing import Dict, Any, Optional
from pathlib import Path

# Load environment variables
load_dotenv()

class VideoAnalyzer:
    """
    A class for analyzing videos to detect wildlife threats and illegal activities
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the VideoAnalyzer with Gemini API
        
        Args:
            api_key: Optional API key. If not provided, will use GEMINI_API_KEY from environment
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Initialize Gemini with correct model name
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    def analyze(self, video_path: str) -> Dict[str, Any]:
        """
        Analyze video with audio for animal protection threats
        
        Args:
            video_path: Path to the video file to analyze
            
        Returns:
            Dict containing the analysis results in JSON format
        """
        try:
            # Clean path by removing spaces
            video_path = video_path.replace(" ", "")
            
            if not os.path.exists(video_path):
                error_result = {
                    "error": f"File not found at {video_path}",
                    "status": "failed",
                    "message": f"🚫 Error: File not found at {video_path}"
                }
                return self._add_metadata(error_result, video_path)

            # Read and encode video
            with open(video_path, "rb") as f:
                video_data = base64.b64encode(f.read()).decode("utf-8")
            
            # Generate timestamp for reporting
            analysis_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Prepare multimodal prompt
            response = self.model.generate_content([
                "EMERGENCY WILDLIFE MONITORING ANALYSIS - BE CONCISE BUT PRECISE",
                {
                    "mime_type": "video/mp4",  # Supports MP4, MOV, AVI
                    "data": video_data
                },
                """Analyze this video for wildlife threats and provide structured analysis.

                Format response as JSON:
                {{
  "species": {{
    "scientific_name": "",            // Full binomial or trinomial, e.g., "Panthera tigris tigris"
    "genus": "",
    "species_epithet": "",
    "subspecies": null,                // or string if identified
    "common_name": "",               // most widely used common name
    "other_common_names": [],         // optional variants/regional names
    "confidence": 0,                  // 0-100 integer
    "taxonomy": {{
      "class": "",
      "order": "",
      "family": ""
    }},
    "distinguishing_features": [      // 3-7 concise phrases from the image that justify the ID
    ],
    "similar_candidates": [           // up to 3 alternatives with reasons they were rejected
      {{
        "scientific_name": "",
        "common_name": "",
        "confidence": 0,
        "why_not": ""
      }}
    ]
  }},
  "conservation": {{
    "iucn_status": "",
    "protected_status": ""           // e.g., CITES or national protection if commonly known
  }},
  "danger_profile": {{
    "is_venomous": null,               // true, false, or null if unknown (use "venomous" for snakes)
    "is_poisonous": null,              // true, false, or null if unknown (toxins by ingestion/contact)
    "toxicity_level": null,            // one of: "low", "moderate", "high", "unknown"
    "primary_toxins": [],             // e.g., ["neurotoxic", "hemotoxic"] when known
    "threat_to_humans": "",          // brief plain-language note
    "evidence": ""                   // basis for assessment (species knowledge + visible context)
  }},
  "health_indicators": {{
    "age_sex": null,                  // e.g., "Adult male" when discernible, else null
    "visible_injuries": [],
    "condition": ""                  // brief assessment if possible
  }},
  "habitat_context": {{
    "environment": "",               // habitat inferred from the image
    "human_impact": null              // null if none visible; else short description
  }},
  "threat_analysis": {{
    "illegal_activity_detected": false,
    "evidence": [], 
    "weapons_traps": [],
    "suspicious_activity": []
  }},
  "risk_assessment": {{
    "ai-score": "",     // out of 10 ( 1 being lowest , 10 being highest) , we are scoring urgency for solution of the report
    "ai-report": "",   // a short report based on the (make sure to keep it short 2-3 lines at most that captures the most important information)
    "urgency": "Low/Moderate/High/Critical/Emergency",
    "evidence_count": null   // integer count of provided in context
  }},
  "incident": {{ // based on the threatDescription and context , tell me which of the conflict/situations matches the most , give "true" or "false"
    "Anti poaching": "",
    "Human wildlife conflict": "",
    "Medical care": "",
    "Habitat restoration": "",
    "Species recovery": ""
  }},
  "Location": "", //Fetched from the context
  "reporter_name": "", //Fetched from the context , if not provided , then "anonymous"
}}

                Risk Level Guidelines:
                - Level 1 (Low): Normal wildlife behavior, no threats
                - Level 2 (Moderate): Minor concerns, monitoring recommended
                - Level 3 (High): Clear threats, immediate attention needed
                - Level 4 (Critical): Severe threats, rapid response required
                - Level 5 (Emergency): Life-threatening situation, immediate intervention
                """
            ])
            
            # Extract and save results
            result = self._extract_json_from_response(response.text)
            return self._add_metadata(result, video_path)
            
        except Exception as e:
            error_result = {
                "error": str(e),
                "status": "failed",
                "message": f"❌ Analysis failed: {e}"
            }
            return self._add_metadata(error_result, video_path)

    def _extract_json_from_response(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from Gemini's response
        
        Args:
            text: Raw response text from Gemini
            
        Returns:
            Parsed JSON as dictionary
        """
        try:
            # First try direct JSON parsing
            return json.loads(text)
        except Exception:
            pass
        
        try:
            # Handle markdown code blocks with ```json ... ```
            if '```json' in text:
                start = text.find('```json') + 7
                end = text.find('```', start)
                if end != -1:
                    json_str = text[start:end].strip()
                    return json.loads(json_str)
        except Exception:
            pass
        
        try:
            # Handle markdown code blocks with just ``` ... ```
            if '```' in text:
                parts = text.split('```')
                for i, part in enumerate(parts):
                    if i % 2 == 1:  # Odd indices are code blocks
                        try:
                            return json.loads(part.strip())
                        except Exception:
                            continue
        except Exception:
            pass
        
        try:
            # Fallback: extract JSON object using regex
            import re
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                return json.loads(match.group(0))
        except Exception:
            pass
        
        # If all parsing fails, return error
        return {
            "raw_response": text,
            "parse_error": "Failed to extract valid JSON",
            "status": "parsing_failed"
        }

    def _add_metadata(self, result: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        """
        Add metadata to the analysis result
        
        Args:
            result: The analysis result
            video_path: The original video path
            
        Returns:
            Dict with added metadata
        """
        metadata = {
            "analysis_type": "video",
            "timestamp": self._get_timestamp(),
            "source": video_path,
            "model": "gemini-2.5-flash",
            "file_size": self._get_file_size(video_path)
        }
        
        if isinstance(result, dict):
            result["metadata"] = metadata
        else:
            result = {
                "data": result,
                "metadata": metadata
            }
        
        return result
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        return datetime.now().isoformat()
    
    def _get_file_size(self, file_path: str) -> Optional[int]:
        """Get file size in bytes"""
        try:
            return os.path.getsize(file_path)
        except:
            return None
    
    def save_results(self, result: Dict[str, Any], output_path: Optional[str] = None) -> str:
        """
        Save analysis results to a JSON file
        
        Args:
            result: The analysis result
            output_path: Optional output path. If not provided, uses default name
            
        Returns:
            Path to the saved file
        """
        if output_path is None:
            output_path = "video_analysis.json"
        
        data = {
            "original_video": result.get("metadata", {}).get("source", "unknown"),
            "analysis_timestamp": self._get_timestamp(),
            "results": result
        }
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        return output_path

# Legacy function for backward compatibility
def analyze_video(video_path: str) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility
    """
    analyzer = VideoAnalyzer()
    return analyzer.analyze(video_path)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Analyze a video for wildlife threats and illegal activities")
    parser.add_argument("video", nargs="?", help="Path to the video file to analyze")
    parser.add_argument("--output", "-o", help="Output file path for results")
    parser.add_argument("--bridge-detect", action="store_true", help="Send results to detect.py to save")
    args = parser.parse_args()

    
    video_path = args.video or "/elephant.mp4"  # Default path
    if not os.path.exists(video_path):
        print(f"🚫 Error: Video file not found at {video_path}")
    else:
        print(f"🔍 Analyzing {video_path}...")
        
        analyzer = VideoAnalyzer()
        result = analyzer.analyze(video_path)
        
        if result:
            print("\n🚨 WILDLIFE ALERT REPORT:")
            pprint(result)
            if args.bridge_detect:
                tmp_path = f"{Path(video_path).stem}_video_tmp.json"
                with open(tmp_path, "w") as f:
                    json.dump(result, f, indent=2)
                try:
                    os.system(
                        f"python3 {Path(__file__).with_name('detect.py')} --save-json {tmp_path} --file {video_path} --file-type video" +
                        (f" --output {args.output}" if args.output else "")
                    )
                finally:
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
            else:
                output_file = args.output or "video_analysis.json"
                analyzer.save_results(result, output_file)
                print(f"✅ Results saved to {output_file}")
        else:
            print("Analysis failed")