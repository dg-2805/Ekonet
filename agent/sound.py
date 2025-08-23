import whisper
import google.generativeai as genai
from dotenv import load_dotenv
import os
import base64
import json
from datetime import datetime
from typing import Dict, Any, Optional, Union
from pathlib import Path

# Load environment variables
load_dotenv()

class AudioAnalyzer:
    """
    A class for analyzing audio files to detect wildlife sounds and threats
    """
    
    def __init__(self, api_key: Optional[str] = None, whisper_model: str = "base"):
        """
        Initialize the AudioAnalyzer with Gemini API and Whisper model
        
        Args:
            api_key: Optional API key. If not provided, will use GEMINI_API_KEY from environment
            whisper_model: Whisper model to use (base, small, medium, large)
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Initialize Gemini 1.5 Flash
        genai.configure(api_key=self.api_key)
        self.model_gemini = genai.GenerativeModel('gemini-2.5-flash')
        
        # Load Whisper model
        self.model_whisper = whisper.load_model(whisper_model)
    
    def encode_audio(self, audio_path: str) -> str:
        """
        Encode audio file to base64 for Gemini
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Base64 encoded audio data
        """
        with open(audio_path, "rb") as audio_file:
            return base64.b64encode(audio_file.read()).decode('utf-8')
    
    def transcribe_audio(self, audio_path: str) -> str:
        """
        Transcribe audio using Whisper
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Transcribed text
        """
        try:
            result = self.model_whisper.transcribe(audio_path)
            return result["text"]
        except Exception as e:
            raise Exception(f"Transcription failed: {e}")
    
    def analyze_with_gemini(self, transcribed_text: str, audio_path: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Enhanced analysis with Gemini 1.5 Flash
        
        Args:
            transcribed_text: Text transcribed from audio
            audio_path: Path to the original audio file
            
        Returns:
            Analysis results as dictionary
        """
        try:
            # Prepare multimodal content
            audio_part = {
                "mime_type": "audio/mp3",
                "data": self.encode_audio(audio_path)
            }
            
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

            # Structured prompt for animal protection focus
            prompt = f"""Wildlife Threat Analysis - Audio + Context{context_info}

You are analyzing an audio recording for wildlife threats and conservation concerns. The audio provides acoustic evidence, and you have additional context information about the incident.

ANALYSIS APPROACH:
1. First, identify any wildlife species audible in the recording with high specificity
2. Then, combine the acoustic evidence with the provided context to assess threats
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
    "distinguishing_features": [      // 3-7 concise phrases from the audio that justify the ID
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
    "evidence": ""                   // basis for assessment (species knowledge + audio context)
  }},
  "health_indicators": {{
    "age_sex": null,                  // e.g., "Adult male" when discernible, else null
    "visible_injuries": [],
    "condition": "",                  // brief assessment if possible
    "distress_signs": []              // vocal indicators of distress
  }},
  "habitat_context": {{
    "environment": "",               // habitat inferred from audio
    "human_impact": null              // null if none audible; else short description
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
- SPECIES IDENTIFICATION: Be specific and include subspecies when justified by audible traits
- CONTEXT INTEGRATION: Use the provided context (location, threat type, description) to enhance your analysis
- THREAT ASSESSMENT: Consider both acoustic evidence and context information when evaluating risks
- CONSERVATION FOCUS: Prioritize conservation concerns and illegal activities
- RISK EVALUATION: Assess urgency based on species vulnerability, threat type, and location
- RECOMMENDATIONS: Provide specific, actionable conservation recommendations

AUDIO TRANSCRIPTION: {transcribed_text}

Return only valid JSON without any Markdown or commentary.
"""

            # Generate analysis
            response = self.model_gemini.generate_content([prompt, audio_part])
            
            # Extract JSON from response
            try:
                text = response.text.strip()
                
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
                return {"raw_response": response.text, "parse_error": f"Failed to extract JSON: {str(e)}"}
            
        except Exception as e:
            return {"error": str(e), "status": "gemini_analysis_failed"}
    
    def analyze_with_context(self, audio_path: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Complete audio analysis pipeline
        
        Args:
            audio_path: Path to the audio file to analyze
            context: Optional context information for enhanced analysis
            
        Returns:
            Complete analysis results as dictionary
        """
        
        if context:
            print(f"🎵 AI Agent received context for audio analysis")
        try:
            # Clean path by removing spaces
            audio_path = audio_path.replace(" ", "")
            
            if not os.path.exists(audio_path):
                error_result = {
                    "error": f"File not found at {audio_path}",
                    "status": "failed",
                    "message": f"Error: File not found at {audio_path}"
                }
                return self._add_metadata(error_result, audio_path)
            
            # Step 1: Audio Transcription
            transcribed_text = self.transcribe_audio(audio_path)
            
            # Step 2: Multimodal Analysis
            analysis = self.analyze_with_gemini(transcribed_text, audio_path, context)
            
            # Create results dictionary with metadata
            result_data = {
                "transcription": transcribed_text,
                "analysis": analysis if isinstance(analysis, dict) else str(analysis)
            }
            
            return self._add_metadata(result_data, audio_path)
            
        except Exception as e:
            error_result = {
                "error": str(e),
                "status": "failed",
                "message": f"❌ Error: {e}"
            }
            return self._add_metadata(error_result, audio_path)
    
    def analyze(self, audio_path: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Legacy method - redirects to analyze_with_context for backward compatibility
        """
        return self.analyze_with_context(audio_path, context)
    
    def _add_metadata(self, result: Dict[str, Any], audio_path: str) -> Dict[str, Any]:
        """
        Add metadata to the analysis result
        
        Args:
            result: The analysis result
            audio_path: The original audio path
            
        Returns:
            Dict with added metadata
        """
        metadata = {
            "analysis_type": "audio",
            "timestamp": self._get_timestamp(),
            "source": audio_path,
            "model": "gemini-2.5-flash + whisper",
            "file_size": self._get_file_size(audio_path)
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
            output_path = "audio_analysis.json"
        
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        return output_path

# Legacy function for backward compatibility
def main():
    """
    Legacy main function for backward compatibility
    """
    # Process audio - remove space in filename if exists
    audio_path = "/home/glodh/Wild/elephant .mp3"  # Fixed filename
    
    if not os.path.exists(audio_path):
        print(f"Error: File not found at {audio_path}")
        return
    
    try:
        analyzer = AudioAnalyzer()
        result = analyzer.analyze(audio_path)
        
        # Save to JSON file
        output_filename = "analysis.json"
        analyzer.save_results(result, output_filename)
        
        print(f"\n✅ Results saved to {output_filename}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Analyze audio for wildlife sounds and threats")
    parser.add_argument("audio", nargs="?", help="Path to the audio file to analyze")
    parser.add_argument("--output", "-o", help="Output file path for results")
    parser.add_argument("--whisper-model", default="base", choices=["base", "small", "medium", "large"], 
                       help="Whisper model to use")
    parser.add_argument("--bridge-detect", action="store_true", help="Send results to detect.py to save")
    args = parser.parse_args()

    audio_path = args.audio or "/home/glodh/Wild/elephant .mp3"  # Default path
    
    if not os.path.exists(audio_path):
        print(f"Error: File not found at {audio_path}")
    else:
        try:
            analyzer = AudioAnalyzer(whisper_model=args.whisper_model)
            result = analyzer.analyze(audio_path)
            if args.bridge_detect:
                tmp_path = f"{Path(audio_path).stem}_audio_tmp.json"
                with open(tmp_path, "w") as f:
                    json.dump(result, f, indent=2)
                try:
                    os.system(
                        f"python3 {Path(__file__).with_name('detect.py')} --save-json {tmp_path} --file {audio_path} --file-type audio" +
                        (f" --output {args.output}" if args.output else "")
                    )
                finally:
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
            else:
                output_file = args.output or "audio_analysis.json"
                analyzer.save_results(result, output_file)
                print(f"\n✅ Results saved to {output_file}")
        except Exception as e:
            print(f"❌ Error: {e}")