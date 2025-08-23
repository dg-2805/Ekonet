import google.generativeai as genai
import base64
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from pprint import pprint
from typing import Dict, Any, Optional, Union

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
                        "scientific_name": "",
                        "genus": "",
                        "species_epithet": "",
                        "subspecies": null,
                        "common_name": "",
                        "other_common_names": [],
                        "confidence": 0,
                        "taxonomy": {{
                            "class": "",
                            "order": "",
                            "family": ""
                        }},
                        "distinguishing_features": [],
                        "similar_candidates": [
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
                        "protected_status": ""
                    }},
                    "danger_profile": {{
                        "is_venomous": null,
                        "is_poisonous": null,
                        "toxicity_level": null,
                        "primary_toxins": [],
                        "threat_to_humans": "",
                        "evidence": ""
                    }},
                    "health_indicators": {{
                        "age_sex": null,
                        "visible_injuries": [],
                        "condition": "",
                        "distress_signs": []
                    }},
                    "habitat_context": {{
                        "environment": "",
                        "human_impact": null
                    }},
                    "threat_analysis": {{
                        "illegal_activity_detected": false,
                        "evidence": [],
                        "weapons_traps": [],
                        "suspicious_activity": []
                    }},
                    "risk_assessment": {{
                        "level": 1,
                        "justification": "",
                        "urgency": "Low/Moderate/High/Critical/Emergency"
                    }},
                    "recommended_actions": []
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
            # Handle markdown code blocks
            if 'json' in text:
                json_str = text.split('json')[1].split('')[0].strip()
            elif '' in text:
                json_str = text.split('')[1].split('')[0].strip()
            else:
                json_str = text
            
            # Convert to dictionary
            return json.loads(json_str)
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