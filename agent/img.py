import google.generativeai as genai
import base64
import os
from dotenv import load_dotenv
from PIL import Image
import requests
from io import BytesIO
import json
import re
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, Union

# Load environment variables
load_dotenv("C:\\Users\\daria\\Documents\\SC2\\Ekonet\\agent\\.env")

class ImageAnalyzer:
    """
    A class for analyzing images to detect wildlife species and provide detailed analysis
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the ImageAnalyzer with Gemini API
        
        Args:
            api_key: Optional API key. If not provided, will use GEMINI_API_KEY from environment
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )
    
    def analyze(self, image_source: Union[str, Image.Image]) -> Dict[str, Any]:
        """
        Analyze an image for animal species detection
        
        Args:
            image_source: Can be either:
                - File path (e.g., "/path/to/image.jpg")
                - URL (e.g., "https://example.com/image.jpg")
                - PIL Image object
                
        Returns:
            Dict containing the analysis results in JSON format
        """
        try:
            # Load image from different sources
            if isinstance(image_source, str):
                if image_source.startswith(('http://', 'https://')):
                    # Download from URL
                    response = requests.get(image_source)
                    img = Image.open(BytesIO(response.content))
                else:
                    # Load from file path
                    img = Image.open(image_source)
            elif isinstance(image_source, Image.Image):
                img = image_source
            else:
                raise ValueError("Unsupported image source type")

            # Prepare prompt for high-specificity wildlife monitoring
            prompt = """Wildlife Species Identification (High Specificity)

Provide the most specific identification visible in the image, including subspecies/breed when possible. Prioritize exact species over general groups. Use only evidence visible in the image and common field marks. Avoid assumptions and avoid mentioning species not supported by the image.

Return ONLY valid JSON matching this schema:
{
  "species": {
    "scientific_name": "",            // Full binomial or trinomial, e.g., "Panthera tigris tigris"
    "genus": "",
    "species_epithet": "",
    "subspecies": null,                // or string if identified
    "common_name": "",               // most widely used common name
    "other_common_names": [],         // optional variants/regional names
    "confidence": 0,                  // 0-100 integer
    "taxonomy": {
      "class": "",
      "order": "",
      "family": ""
    },
    "distinguishing_features": [      // 3-7 concise phrases from the image that justify the ID
    ],
    "similar_candidates": [           // up to 3 alternatives with reasons they were rejected
      {
        "scientific_name": "",
        "common_name": "",
        "confidence": 0,
        "why_not": ""
      }
    ]
  },
  "conservation": {
    "iucn_status": "",
    "protected_status": ""           // e.g., CITES or national protection if commonly known
  },
  "danger_profile": {
    "is_venomous": null,               // true, false, or null if unknown (use "venomous" for snakes)
    "is_poisonous": null,              // true, false, or null if unknown (toxins by ingestion/contact)
    "toxicity_level": null,            // one of: "low", "moderate", "high", "unknown"
    "primary_toxins": [],             // e.g., ["neurotoxic", "hemotoxic"] when known
    "threat_to_humans": "",          // brief plain-language note
    "evidence": ""                   // basis for assessment (species knowledge + visible context)
  },
  "health_indicators": {
    "age_sex": null,                  // e.g., "Adult male" when discernible, else null
    "visible_injuries": [],
    "condition": ""                  // brief assessment if possible
  },
  "habitat_context": {
    "environment": "",               // habitat inferred from the image
    "human_impact": null              // null if none visible; else short description
  },
  "threat_analysis": {
    "illegal_activity_detected": false,
    "evidence": [],
    "weapons_traps": [],
    "suspicious_activity": []
  },
  "risk_assessment": {
    "level": 1,                       // 1=Low, 2=Moderate, 3=High, 4=Critical, 5=Emergency
    "justification": "",
    "urgency": "Low/Moderate/High/Critical/Emergency"
  },
  "recommended_actions": []
}

Guidelines:
- Be specific: include subspecies/breed when plausible and justified by visible traits and context.
- For snakes, identify exact species (e.g., genus + species) and include regional variants if relevant.
- For big cats (e.g., tigers, leopards), prefer trinomial subspecies when visible traits allow.
- If subspecies cannot be justified, set "subspecies" to null and explain in distinguishing features.
- For toxicity: prefer "is_venomous" for snakes; only set values you are confident about. Use null if uncertain.
- Do not include any Markdown or commentary, return only JSON.
"""

            # Generate analysis
            response = self.model.generate_content([prompt, img])

            # Extract JSON from response with robust parsing
            raw_text = getattr(response, 'text', '') or ''
            
            # First try direct JSON
            try:
                result = json.loads(raw_text)
                return self._add_metadata(result, image_source)
            except Exception:
                pass
            
            # Then try fenced code blocks
            try:
                fenced = raw_text.split('json')[1].split('')[0].strip()
                result = json.loads(fenced)
                return self._add_metadata(result, image_source)
            except Exception:
                pass
            
            # Lastly, extract the first JSON object using a broad regex
            try:
                match = re.search(r"\{[\s\S]*\}$", raw_text)
                if match:
                    result = json.loads(match.group(0))
                    return self._add_metadata(result, image_source)
            except Exception:
                pass
            
            # If all parsing fails, return raw response
            return self._add_metadata({"raw_response": raw_text, "error": "Failed to parse JSON"}, image_source)

        except Exception as e:
            error_result = {
                "error": str(e),
                "status": "failed",
                "message": f"Analysis failed: {e}"
            }
            return self._add_metadata(error_result, image_source)
    
    def _add_metadata(self, result: Dict[str, Any], image_source: Union[str, Image.Image]) -> Dict[str, Any]:
        """
        Add metadata to the analysis result
        
        Args:
            result: The analysis result
            image_source: The original image source
            
        Returns:
            Dict with added metadata
        """
        metadata = {
            "analysis_type": "image",
            "timestamp": self._get_timestamp(),
            "source": str(image_source) if isinstance(image_source, str) else "PIL_Image",
            "model": "gemini-2.5-flash"
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
        from datetime import datetime
        return datetime.now().isoformat()
    
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
            output_path = "image_analysis.json"
        
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
        
        return output_path

# Legacy function for backward compatibility
def analyze_image(image_source):
    """
    Legacy function for backward compatibility
    """
    analyzer = ImageAnalyzer()
    return analyzer.analyze(image_source)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze an image for wildlife species identification")
    parser.add_argument("image", nargs="?", help="Path or URL to the image to analyze")
    parser.add_argument("--output", "-o", help="Output file path for results")
    parser.add_argument("--bridge-detect", action="store_true", help="Send results to detect.py to save")
    args = parser.parse_args()

    if not args.image:
        print("Usage: python -m wild.ai.img /path/to/image.jpg")
        raise SystemExit(2)

    image_input = args.image
    print(f"🔍 Analyzing image for wildlife species: {image_input}")
    
    analyzer = ImageAnalyzer()
    result = analyzer.analyze(image_input)

    if result:
        # Either save directly or via detect.py bridge for centralized saving
        if args.bridge_detect:
            tmp_path = f"{Path(image_input).stem}_image_tmp.json"
            with open(tmp_path, "w") as f:
                json.dump(result, f, indent=2)
            try:
                # Call detect.py save-only mode
                os.system(
                    f"python3 {Path(__file__).with_name('detect.py')} --save-json {tmp_path} --file {image_input} --file-type image" +
                    (f" --output {args.output}" if args.output else "")
                )
            finally:
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
        else:
            output_file = args.output or "image_analysis.json"
            #analyzer.save_results(result, output_file)
            print(f"✅ Results saved to {output_file}")
    else:
        print("No species detected or analysis failed")