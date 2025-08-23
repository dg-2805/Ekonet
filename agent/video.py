import google.generativeai as genai
import base64
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from pprint import pprint
from typing import Dict, Any, Optional, Union
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
    
    def analyze_with_context(self, video_path: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Analyze video with audio for animal protection threats
        
        Args:
            video_path: Path to the video file to analyze
            context: Optional context information for enhanced analysis
            
        Returns:
            Dict containing the analysis results in JSON format
        """
        
        if context:
            print(f"🎥 AI Agent received context for video analysis")
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
            
            # Prepare context information
            context_info = ""
            if context:
                context_info = f"""
CONTEXT INFORMATION:
- Location: {context.get("location", "Not provided")}
- Threat Description: {context.get("description", "Not provided")}
- Threat Type: {context.get("threat_type", "Not provided")}
- Coordinates: {context.get("coordinates", "Not provided")}
- Report ID: {context.get("report_id", "Not provided")}

Use this context to enhance your analysis, especially for threat assessment and risk evaluation.
"""

            # Prepare multimodal prompt
            prompt = f"""Wildlife Threat Analysis - Video + Context{context_info}

You are analyzing a video for wildlife threats and conservation concerns. The video shows the visual evidence, and you have additional context information about the incident.

ANALYSIS APPROACH:
1. First, identify any wildlife species visible in the video with high specificity
2. Then, combine the visual evidence with the provided context to assess threats
3. Consider the location, threat type, and description when evaluating risks
4. Provide comprehensive threat assessment and conservation recommendations

Return ONLY valid JSON matching this schema:
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
    "distinguishing_features": [      // 3-7 concise phrases from the video that justify the ID
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
    "condition": "",                  // brief assessment if possible
    "distress_signs": []              // behavioral indicators of distress
  }},
  "habitat_context": {{
    "environment": "",               // habitat inferred from the video
    "human_impact": null              // null if none visible; else short description
  }},
  "threat_analysis": {{
    "illegal_activity_detected": false,
    "evidence": [],
    "weapons_traps": [],
    "suspicious_activity": []
  }},
  "risk_assessment": {{
    "level": 1,                       // 1=Low, 2=Moderate, 3=High, 4=Critical, 5=Emergency
    "justification": "",
    "urgency": "Low/Moderate/High/Critical/Emergency"
  }},
  "ngo_recommendation": [
    "Anti poaching",
    "Human wildlife conflict",
    "Medical care",
    "Habitat restoration",
    "Species recovery"
  ],
  "recommended_actions": []
}}

ANALYSIS GUIDELINES:
- SPECIES IDENTIFICATION: Be specific and include subspecies when justified by visible traits
- CONTEXT INTEGRATION: Use the provided context (location, threat type, description) to enhance your analysis
- THREAT ASSESSMENT: Consider both visual evidence and context information when evaluating risks
- CONSERVATION FOCUS: Prioritize conservation concerns and illegal activities
- RISK EVALUATION: Assess urgency based on species vulnerability, threat type, and location
- RECOMMENDATIONS: Provide specific, actionable conservation recommendations

Return only valid JSON without any Markdown or commentary.
"""

            response = self.model.generate_content([
                prompt,
                {
                    "mime_type": "video/mp4",  # Supports MP4, MOV, AVI
                    "data": video_data
                }
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
    
    def analyze(self, video_path: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Legacy method - redirects to analyze_with_context for backward compatibility
        """
        return self.analyze_with_context(video_path, context)

    def _extract_json_from_response(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from Gemini's response
        
        Args:
            text: Raw response text from Gemini
            
        Returns:
            Parsed JSON as dictionary
        """
        try:
            # Try to find JSON in the response
            text = text.strip()
            
            # Look for JSON code blocks
            if '```json' in text:
                start = text.find('```json') + 7
                end = text.find('```', start)
                if end != -1:
                    json_str = text[start:end].strip()
                    return json.loads(json_str)
            
            # Look for JSON without language specifier
            if '```' in text:
                start = text.find('```') + 3
                end = text.find('```', start)
                if end != -1:
                    json_str = text[start:end].strip()
                    # Try to parse as JSON
                    try:
                        return json.loads(json_str)
                    except:
                        pass
            
            # Look for JSON object directly in the text
            # Find the first { and last }
            start = text.find('{')
            end = text.rfind('}')
            
            if start != -1 and end != -1 and end > start:
                json_str = text[start:end + 1]
                return json.loads(json_str)
            
            # If no JSON found, return the raw text
            return {
                "raw_response": text,
                "parse_error": "No valid JSON found in response",
                "status": "parsing_failed"
            }
            
        except Exception as e:
            return {
                "raw_response": text,
                "parse_error": str(e),
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

    video_path = args.video or "/home/glodh/Wild/elephant.mp4"  # Default path
    
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