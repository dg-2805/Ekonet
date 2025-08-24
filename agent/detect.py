#!/usr/bin/env python3
"""
Wildlife Detection System - Universal File Analyzer

This module provides a unified interface for analyzing wildlife-related files
including images, videos, and audio files. It automatically detects the file type
and routes to the appropriate analyzer.
"""

import os
import json
import argparse
import mimetypes
from pathlib import Path
from typing import Dict, Any, Optional, Union
from datetime import datetime

# Import our analyzer classes
from img import ImageAnalyzer
from video2 import VideoAnalyzer
from sound import AudioAnalyzer

class UniversalDetector:
    """
    Universal detector that can handle any type of file and route to appropriate analyzer
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the UniversalDetector
        
        Args:
            api_key: Optional API key. If not provided, will use GEMINI_API_KEY from environment
        """
        self.api_key = api_key
        self.image_analyzer = ImageAnalyzer(api_key)
        self.video_analyzer = VideoAnalyzer(api_key)
        self.audio_analyzer = AudioAnalyzer(api_key)
        
        # Supported file extensions
        self.supported_extensions = {
            'image': {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'},
            'video': {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'},
            'audio': {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'}
        }
    
    def detect_file_type(self, file_path: str) -> str:
        """
        Detect the type of file based on extension and MIME type
        
        Args:
            file_path: Path to the file
            
        Returns:
            File type: 'image', 'video', 'audio', or 'unknown'
        """
        # Get file extension
        file_ext = Path(file_path).suffix.lower()
        
        # Check by extension first
        for file_type, extensions in self.supported_extensions.items():
            if file_ext in extensions:
                return file_type
        
        # Fallback to MIME type detection
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type:
            if mime_type.startswith('image/'):
                return 'image'
            elif mime_type.startswith('video/'):
                return 'video'
            elif mime_type.startswith('audio/'):
                return 'audio'
        
        return 'unknown'
    
    def analyze(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze any file type and return results
        
        Args:
            file_path: Path to the file to analyze
            
        Returns:
            Analysis results as dictionary
        """
        try:
            # Clean path and check if file exists
            file_path = file_path.replace(" ", "")
            
            if not os.path.exists(file_path):
                error_result = {
                    "error": f"File not found at {file_path}",
                    "status": "failed",
                    "message": f"🚫 Error: File not found at {file_path}"
                }
                return self._add_metadata(error_result, file_path, "unknown")
            
            # Detect file type
            file_type = self.detect_file_type(file_path)
            
            if file_type == 'unknown':
                error_result = {
                    "error": f"Unsupported file type: {Path(file_path).suffix}",
                    "status": "failed",
                    "message": f"❌ Unsupported file type: {Path(file_path).suffix}"
                }
                return self._add_metadata(error_result, file_path, file_type)
            
            # Route to appropriate analyzer
            print(f"🔍 Detected file type: {file_type}")
            print(f"📁 Analyzing: {file_path}")
            
            if file_type == 'image':
                result = self.image_analyzer.analyze(file_path)
            elif file_type == 'video':
                result = self.video_analyzer.analyze(file_path)
            elif file_type == 'audio':
                result = self.audio_analyzer.analyze(file_path)
            else:
                error_result = {
                    "error": f"Unsupported file type: {file_type}",
                    "status": "failed",
                    "message": f"❌ Unsupported file type: {file_type}"
                }
                return self._add_metadata(error_result, file_path, file_type)
            
            # Add universal metadata
            return self._add_metadata(result, file_path, file_type)
            
        except Exception as e:
            error_result = {
                "error": str(e),
                "status": "failed",
                "message": f"❌ Analysis failed: {e}"
            }
            return self._add_metadata(error_result, file_path, "unknown")
    
    def _add_metadata(self, result: Dict[str, Any], file_path: str, file_type: str) -> Dict[str, Any]:
        """
        Add universal metadata to the analysis result
        
        Args:
            result: The analysis result
            file_path: The original file path
            file_type: The detected file type
            
        Returns:
            Dict with added metadata
        """
        # Get file info
        file_info = self._get_file_info(file_path)
        
        universal_metadata = {
            "universal_detector": {
                "detected_file_type": file_type,
                "analysis_timestamp": self._get_timestamp(),
                "file_info": file_info,
                "version": "1.0.0"
            }
        }
        
        if isinstance(result, dict):
            # Merge with existing metadata if present
            if "metadata" in result:
                result["metadata"].update(universal_metadata)
            else:
                result["metadata"] = universal_metadata
        else:
            result = {
                "data": result,
                "metadata": universal_metadata
            }
        
        return result
    
    def _get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get file information"""
        try:
            stat = os.stat(file_path)
            return {
                "path": file_path,
                "name": Path(file_path).name,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "extension": Path(file_path).suffix.lower(),
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
        except Exception as e:
            return {
                "path": file_path,
                "error": str(e)
            }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        return datetime.now().isoformat()
    
    def save_results(self, result: Dict[str, Any], output_path: Optional[str] = None) -> str:
        """
        Save analysis results to a JSON file
        
        Args:
            result: The analysis result
            output_path: Optional output path. If not provided, generates based on input file
            
        Returns:
            Path to the saved file
        """
        if output_path is None:
            # Generate output path based on input file
            input_file = result.get("metadata", {}).get("universal_detector", {}).get("file_info", {}).get("name", "unknown")
            file_type = result.get("metadata", {}).get("universal_detector", {}).get("detected_file_type", "unknown")
            base_name = Path(input_file).stem
            output_path = f"{base_name}_{file_type}_analysis.json"
        
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        return output_path
    
    def save_external_result(self, external_result: Dict[str, Any], file_path: str, file_type: str, output_path: Optional[str] = None) -> str:
        """
        Accept an already-produced analysis JSON and save it through the universal
        detector so that consistent metadata and naming are applied.
        """
        # Merge in universal metadata then save
        merged = self._add_metadata(external_result, file_path, file_type)
        return self.save_results(merged, output_path)
    
    def batch_analyze(self, file_paths: list, output_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze multiple files in batch
        
        Args:
            file_paths: List of file paths to analyze
            output_dir: Optional output directory for results
            
        Returns:
            Dictionary with results for all files
        """
        results = {}
        
        for file_path in file_paths:
            print(f"\n🔍 Processing: {file_path}")
            result = self.analyze(file_path)
            
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                output_file = os.path.join(output_dir, f"{Path(file_path).stem}_analysis.json")
                self.save_results(result, output_file)
                print(f"✅ Saved to: {output_file}")
            
            results[file_path] = result
        
        return results

def main():
    """Main function for command line usage"""
    parser = argparse.ArgumentParser(
        description="Universal Wildlife Detection System - Analyze any file type",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python detect.py image.jpg                    # Analyze single image
  python detect.py video.mp4 --output results.json  # Analyze video with custom output
  python detect.py audio.mp3 --batch            # Analyze multiple files
  python detect.py *.jpg --output-dir results/  # Batch analyze all JPG files
        """
    )
    
    parser.add_argument("files", nargs="*", help="File(s) to analyze (use quotes for paths with spaces)")
    parser.add_argument("--output", "-o", help="Output file path for single file analysis")
    parser.add_argument("--output-dir", "-d", help="Output directory for batch analysis")
    parser.add_argument("--batch", action="store_true", help="Enable batch mode for multiple files")
    parser.add_argument("--api-key", help="Gemini API key (optional, can use environment variable)")
    parser.add_argument("--save-json", help="Path to existing analysis JSON to save with universal metadata")
    parser.add_argument("--file", dest="src_file", help="Original source file path when using --save-json")
    parser.add_argument("--file-type", choices=["image", "video", "audio", "unknown"], help="Detected file type when using --save-json")
    
    args = parser.parse_args()
    
    # Initialize detector
    detector = UniversalDetector(api_key=args.api_key)

    # Save-only mode for external analyzer outputs
    if args.save_json:
        if not args.src_file:
            print("❌ --file is required when using --save-json")
            return
        file_type = args.file_type or detector.detect_file_type(args.src_file)
        try:
            with open(args.save_json, "r") as f:
                external = json.load(f)
        except Exception as e:
            print(f"❌ Failed to read JSON: {e}")
            return
        output_file = args.output or f"{Path(args.src_file).stem}_{file_type}_analysis.json"
        saved_path = detector.save_external_result(external, args.src_file, file_type, output_file)
        print(f"✅ Results saved to: {saved_path}")
        return

    if len(args.files) == 1 and not args.batch:
        # Single file analysis
        file_path = args.files[0]
        print(f"🔍 Universal Wildlife Detection System")
        print(f"📁 File: {file_path}")
        
        result = detector.analyze(file_path)
        
        if result:
            output_file = args.output or f"{Path(file_path).stem}_analysis.json"
            detector.save_results(result, output_file)
            print(f"✅ Results saved to: {output_file}")
            
            # Print summary
            file_type = result.get("metadata", {}).get("universal_detector", {}).get("detected_file_type", "unknown")
            print(f"📊 File type detected: {file_type}")
            
            if "error" in result:
                print(f"❌ Analysis failed: {result['error']}")
            else:
                print("✅ Analysis completed successfully")
        else:
            print("❌ Analysis failed")
    
    else:
        # Batch analysis
        print(f"🔍 Universal Wildlife Detection System - Batch Mode")
        print(f"📁 Files: {len(args.files)} files")
        
        results = detector.batch_analyze(args.files, args.output_dir)
        
        # Print summary
        successful = sum(1 for r in results.values() if "error" not in r)
        failed = len(results) - successful
        
        print(f"\n📊 Batch Analysis Summary:")
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📁 Total: {len(results)}")

if __name__ == "__main__":
    main()
     