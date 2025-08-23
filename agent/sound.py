import whisper
import google.generativeai as genai
from dotenv import load_dotenv
import os
import base64
import json
from datetime import datetime
from typing import Dict, Any, Optional, Union

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
    
    def analyze_with_gemini(self, transcribed_text: str, audio_path: str) -> Dict[str, Any]:
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
            
            # Structured prompt for animal protection focus
            prompt = """**Animal Protection Analysis Task**
            
            **Inputs:**
            1. Audio recording (provided)
            2. Transcription: {transcription}

            **Required Analysis:**
            - **Species Identification** (include confidence %)
            - **Distress Detection** (vocalizations, human speech cues)
            - **Illegal Activity Indicators** (key phrases, sounds)
            - **Location Clues** (background noises suggesting habitat)
            - **Urgency Assessment** (1-5 scale with justification)

            **Output Format:**
            json
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
            """.format(transcription=transcribed_text)

            # Generate analysis
            response = self.model_gemini.generate_content([prompt, audio_part])
            
            # Extract JSON from Markdown if needed
            try:
                return json.loads(response.text.split('json')[1].split('')[0].strip())
            except:
                return {"raw_response": response.text, "parse_error": "Failed to extract JSON"}
            
        except Exception as e:
            return {"error": str(e), "status": "gemini_analysis_failed"}
    
    def analyze(self, audio_path: str) -> Dict[str, Any]:
        """
        Complete audio analysis pipeline
        
        Args:
            audio_path: Path to the audio file to analyze
            
        Returns:
            Complete analysis results as dictionary
        """
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
            print("🦻 Transcribing audio...")
            transcribed_text = self.transcribe_audio(audio_path)
            print(f"\n🔊 Transcription:\n{transcribed_text}")
            
            # Step 2: Multimodal Analysis
            print("\n🔍 Analyzing with Gemini 2.5 Flash...")
            analysis = self.analyze_with_gemini(transcribed_text, audio_path)
            
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