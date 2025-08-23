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
load_dotenv("C:/PROJECTS/StatusCode2/Ekonet/agent/.env")


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
            "gemini-2.5-flash",
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )

    def analyze_with_context(
        self,
        image_source: Union[str, Image.Image],
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze an image for animal species detection

        Args:
            image_source: Can be either:
                - File path (e.g., "/path/to/image.jpg")
                - URL (e.g., "https://example.com/image.jpg")
                - PIL Image object
            context: Optional context information including:
                - location: Location description
                - description: Threat description
                - threat_type: Type of threat
                - coordinates: GPS coordinates

        Returns:
            Dict containing the analysis results in JSON format
        """
        try:
            # Load image from different sources
            if isinstance(image_source, str):
                if image_source.startswith(("http://", "https://")):
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
            context_info = ""
            if context:
                print(f"🧠 AI Agent received context for analysis")

                context_info = f"""
CONTEXT INFORMATION:
- Location: {context.get("location", "Not provided")}
- Threat Description: {context.get("description", "Not provided")}
- Threat Type: {context.get("threat_type", "Not provided")}
- Coordinates: {context.get("coordinates", "Not provided")}
- Report ID: {context.get("report_id", "Not provided")}
- Evidence Count: {context.get("evidence_count", "Not provided")}
- Reporter Name: {context.get("reporter_name", "anonymous")}

Use this context to enhance your analysis, especially for threat assessment and risk evaluation.
"""

            prompt = f"""Wildlife Threat Analysis - Image + Context{context_info}

You are analyzing an image for wildlife threats and conservation concerns. The image shows the visual evidence, and you have additional context information about the incident.

ANALYSIS APPROACH:
1. First, identify any wildlife species visible in the image with high specificity
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

ANALYSIS GUIDELINES:
- SPECIES IDENTIFICATION: Be specific and include subspecies when justified by visible traits
- CONTEXT INTEGRATION: Use the provided context (location, threat type, description) to enhance your analysis
- THREAT ASSESSMENT: Consider both visual evidence and context information when evaluating risks
- CONSERVATION FOCUS: Prioritize conservation concerns and illegal activities
- RISK EVALUATION: Assess urgency based on species vulnerability, threat type, and location
- RECOMMENDATIONS: Provide specific, actionable conservation recommendations

Return only valid JSON without any Markdown or commentary.
"""

            # Generate analysis
            response = self.model.generate_content([prompt, img])

            # Extract JSON from response with robust parsing
            raw_text = getattr(response, "text", "") or ""

            # First try direct JSON
            try:
                result = json.loads(raw_text)
                return self._add_metadata(result, image_source)
            except Exception:
                pass

            # Then try fenced code blocks
            try:
                fenced = raw_text.split("json")[1].split("")[0].strip()
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
            return self._add_metadata(
                {"raw_response": raw_text, "error": "Failed to parse JSON"},
                image_source,
            )

        except Exception as e:
            error_result = {
                "error": str(e),
                "status": "failed",
                "message": f"Analysis failed: {e}",
            }
            return self._add_metadata(error_result, image_source)

#     def analyze_text_with_context(
#         self, description: str, context: Optional[Dict[str, Any]] = None
#     ) -> Dict[str, Any]:
#         """
#         Analyze text description for threat assessment

#         Args:
#             description: Text description of the threat/incident
#             context: Optional context information for enhanced analysis

#         Returns:
#             Dict containing the analysis results in JSON format
#         """
#         try:
#             # Prepare context information
#             context_info = ""
#             if context:
#                 print(f"🧠 AI Agent received context for text analysis")

#                 context_info = f"""
# CONTEXT INFORMATION:
# - Location: {context.get("location", "Not provided")}
# - Threat Description: {context.get("description", "Not provided")}
# - Threat Type: {context.get("threat_type", "Not provided")}
# - Coordinates: {context.get("coordinates", "Not provided")}
# - Report ID: {context.get("report_id", "Not provided")}

# Use this context to enhance your analysis, especially for threat assessment and risk evaluation.
# """

#             # Prepare prompt for text-based threat analysis
#             prompt = f"""Wildlife Threat Analysis - Text Description + Context{
#                 context_info
#             }

# You are analyzing an image for wildlife threats with supporting context.  
# The goal is to identify the species, assess threats, and recommend actions with a clear priority score.  

# INSTRUCTIONS:
# 1. Identify the species (scientific name + common name, taxonomy, and confidence).  
# 2. Assess conservation relevance (IUCN, CITES/national protection).  
# 3. Analyze danger profile (venomous/poisonous, threat to humans, evidence).  
# 4. Check health indicators (age/sex, visible injuries, condition).  
# 5. Describe habitat context (environment + visible human impact).  
# 6. Threat analysis (illegal activity, traps, suspicious activity).  
# 7. Risk assessment:  
#    - Priority flag: Low / Medium / High / Critical  
#    - Risk score: 1–10  
#    - Justification  
# 8. Recommend best NGO type for handling the incident:  
#    - "Anti poaching"  
#    - "Human wildlife conflict"  
#    - "Medical care"  
#    - "Habitat restoration"  
#    - "Species recovery"  
# 9. Provide specific recommended actions.

# OUTPUT:  
# Return ONLY valid JSON in this schema:

# {
#                 "species": {
#                     "scientific_name": "",
#     "common_name": "",
#     "confidence": 0,
#     "taxonomy": {"class": "", "order": "", "family": "" },
#     "distinguishing_features": [],
#     "similar_candidates": []
#   },
#   "conservation": {
#                     "iucn_status": "",
#     "protected_status": ""
#   },
#   "danger_profile": {
#                     "is_venomous": null,
#     "is_poisonous": null,
#     "toxicity_level": null,
#     "primary_toxins": [],
#     "threat_to_humans": "",
#     "evidence": ""
#   },
#   "health_indicators": {
#                     "age_sex": null,
#     "visible_injuries": [],
#     "condition": ""
#   },
#   "habitat_context": {
#                     "environment": "",
#     "human_impact": null
#   },
#   "threat_analysis": {
#                     "illegal_activity_detected": false,
#     "evidence": [],
#     "weapons_traps": [],
#     "suspicious_activity": []
#   },
#   "risk_assessment": {
#                     "priority_flag": "Low/Medium/High/Critical",
#     "risk_score": 0,
#     "justification": ""
#   },
#   "ngo_recommendation": {
#     "Anti poaching": "",
#     "Human wildlife conflict": "",
#     "Medical care": "",
#     "Habitat restoration": "",
#     "Species recovery": ""
#   },
#   "risk_level" : {
#     "level": "",                       // 1=Low, 2=Moderate, 3=High, 4=Critical, 5=Emergency
#   },
#   "recommended_actions": []
# }

# GUIDELINES:
# - Always integrate context info (location, threat type, description, coordinates).  
# - Be concise, precise, and conservation-focused.  
# - Never return extra text, only valid JSON.
# - ngo_recommendation is required and should be a dictionary with keys as the NGO type and values as the description.


# TEXT DESCRIPTION TO ANALYZE:
# {description}

# Analyze this description with the provided context and provide a comprehensive threat assessment in the specified JSON format."""

#             # Get response from Gemini
#             response = self.model.generate_content(prompt)

#             # Parse the response
#             if response.text:
#                 # Extract JSON from response
#                 json_match = re.search(r"\{.*\}", response.text, re.DOTALL)
#                 if json_match:
#                     json_str = json_match.group()
#                     result = json.loads(json_str)

#                     # Add analysis metadata
#                     result["analysis_type"] = "text_description"
#                     result["source"] = "text_input"

#                     return result
#                 else:
#                     return {
#                         "error": "No valid JSON found in response",
#                         "raw_response": response.text,
#                         "status": "json_parsing_failed",
#                     }
#             else:
#                 return {
#                     "error": "Empty response from AI model",
#                     "status": "empty_response",
#                 }

#         except Exception as e:
#             return {"error": str(e), "status": "text_analysis_failed"}

    def analyze(
        self,
        image_source: Union[str, Image.Image],
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Legacy method - redirects to analyze_with_context for backward compatibility
        """
        return self.analyze_with_context(image_source, context)

    def analyze_text(
        self, description: str, context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Legacy method - redirects to analyze_text_with_context for backward compatibility
        """
        return self.analyze_text_with_context(description, context)

    def _add_metadata(
        self, result: Dict[str, Any], image_source: Union[str, Image.Image]
    ) -> Dict[str, Any]:
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
            "source": str(image_source)
            if isinstance(image_source, str)
            else "PIL_Image",
            "model": "gemini-2.5-flash",
        }

        if isinstance(result, dict):
            result["metadata"] = metadata
        else:
            result = {"data": result, "metadata": metadata}

        return result

    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime

        return datetime.now().isoformat()

    def save_results(
        self, result: Dict[str, Any], output_path: Optional[str] = None
    ) -> str:
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
    parser = argparse.ArgumentParser(
        description="Analyze an image for wildlife species identification"
    )
    parser.add_argument("image", nargs="?", help="Path or URL to the image to analyze")
    parser.add_argument("--output", "-o", help="Output file path for results")
    parser.add_argument(
        "--bridge-detect", action="store_true", help="Send results to detect.py to save"
    )
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
                    f"python3 {Path(__file__).with_name('detect.py')} --save-json {tmp_path} --file {image_input} --file-type image"
                    + (f" --output {args.output}" if args.output else "")
                )
            finally:
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
        else:
            output_file = args.output or "image_analysis.json"
            # analyzer.save_results(result, output_file)
            print(f"✅ Results saved to {output_file}")
    else:
        print("No species detected or analysis failed")
