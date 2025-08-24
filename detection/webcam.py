import cv2
import torch
from ultralytics import YOLO
import time
from collections import defaultdict
import os
import json
import signal
import sys

# Fix Qt display issues for different display servers
import os
# Force use of xcb platform for better compatibility
os.environ['QT_QPA_PLATFORM'] = 'xcb'
# Alternative: disable Qt plugins entirely
os.environ['QT_LOGGING_RULES'] = 'qt5ct.debug=false'

# Animal classes in COCO dataset - CORRECTED MAPPING
ANIMAL_CLASSES = {
    15: 'cat', 16: 'dog', 17: 'horse', 18: 'sheep', 19: 'cow',  # Fixed: 15=cat, 16=dog
    20: 'elephant', 21: 'bear', 22: 'zebra', 23: 'giraffe'
    # Note: Class 24 is 'backpack', not an animal - removed lion
}

# Colors for different animal classes - CORRECTED
COLORS = {
    15: (0, 0, 255),    # Cat - red  
    16: (255, 0, 0),    # Dog - blue
    17: (0, 255, 255),  # Horse - yellow
    18: (255, 0, 255),  # Sheep - magenta
    19: (255, 255, 0),  # Cow - cyan
    20: (0, 165, 255),  # Elephant - orange
    21: (128, 0, 128),  # Bear - purple
    22: (0, 255, 0),    # Zebra - green
    23: (255, 165, 0),  # Giraffe - orange-red
    # Removed class 24 (backpack) as it's not an animal
}

def check_camera_availability():
    """Check if camera devices are available"""
    import glob
    video_devices = glob.glob('/dev/video*')
    print(f"Available video devices: {video_devices}")
    return len(video_devices) > 0

def save_json_output(output_file, detection_events, start_time, animal_detections, frame_count, processed_frames, confidence_threshold):
    """Save the JSON output file"""
    try:
        # Create final summary
        total_time = time.time() - start_time
        
        # Create comprehensive JSON summary
        summary_json = {
            "event": "final_summary",
            "timestamp": time.time(),
            "session_stats": {
                "total_time_seconds": round(total_time, 2),
                "total_frames": frame_count,
                "processed_frames": processed_frames,
                "average_fps": round(processed_frames/total_time, 1) if total_time > 0 else 0,
                "confidence_threshold": confidence_threshold
            }
        }
        
        # Add detection results
        if animal_detections:
            most_detected = max(animal_detections.items(), key=lambda x: x[1])
            total_detections = sum(animal_detections.values())
            
            # Create sorted list of all detections with percentages
            all_detections = []
            for animal, count in sorted(animal_detections.items(), key=lambda x: x[1], reverse=True):
                percentage = round((count/total_detections)*100, 1)
                all_detections.append({
                    "animal": animal,
                    "count": count,
                    "percentage": percentage
                })
            
            summary_json["detection_results"] = {
                "total_detections": total_detections,
                "most_detected_animal": {
                    "animal": most_detected[0],
                    "count": most_detected[1],
                    "percentage": round((most_detected[1]/total_detections)*100, 1)
                },
                "all_animals": all_detections
            }
            
            # Print summary to terminal
            print(f"\n=== Detection Summary ===")
            print(f"🏆 MOST DETECTED ANIMAL: {most_detected[0].upper()} ({most_detected[1]} times)")
            print(f"📊 This represents {(most_detected[1]/total_detections)*100:.1f}% of all detections")
        else:
            summary_json["detection_results"] = {
                "total_detections": 0,
                "most_detected_animal": None,
                "all_animals": []
            }
            print(f"\n=== Detection Summary ===")
            print("❌ No animals were detected during the session")
        
        # Add final summary to events
        detection_events.append(summary_json)
        
        # Save all events to JSON file
        with open(output_file, 'w') as f:
            json.dump({
                "session_info": {
                    "start_time": start_time,
                    "end_time": time.time(),
                    "total_events": len(detection_events)
                },
                "events": detection_events
            }, f, indent=2)
        print(f"✅ Complete detection data saved to: {output_file}")
        return True
    except Exception as e:
        print(f"❌ Error saving JSON file: {e}")
        # Fallback: print to terminal
        print("Fallback - JSON data:")
        print(json.dumps(detection_events, indent=2))
        return False

def main():
    # Check camera availability first
    if not check_camera_availability():
        print("Warning: No video devices found!")
    # Initialize JSON output file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(script_dir, "output.json")
    detection_events = []
    
    print(f"JSON output will be saved to: {output_file}")
    
    # Global variables for signal handler
    global global_detection_events, global_start_time, global_animal_detections
    global global_frame_count, global_processed_frames, global_confidence_threshold, global_output_file
    
    global_detection_events = detection_events
    global_start_time = 0
    global_animal_detections = defaultdict(int)
    global_frame_count = 0
    global_processed_frames = 0
    global_confidence_threshold = 0.5
    global_output_file = output_file
    
    # Signal handler for Ctrl+C
    def signal_handler(sig, frame):
        print('\n🛑 Ctrl+C detected! Saving results and exiting...')
        save_json_output(global_output_file, global_detection_events, global_start_time, 
                        global_animal_detections, global_frame_count, global_processed_frames, 
                        global_confidence_threshold)
        if 'cap' in locals() or 'cap' in globals():
            try:
                cap.release()
                cv2.destroyAllWindows()
            except:
                pass
        sys.exit(0)
    
    # Register signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    # Load YOLOv8 model - using larger model for better accuracy
    print("Loading YOLOv8 model (yolov8s.pt)...")
    try:
        model = YOLO('yolov8s.pt')
        # Warm up the model with higher resolution
        model(torch.zeros(1, 3, 640, 640).cpu(), verbose=False)
        
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Make sure you have installed: pip install ultralytics opencv-python")
        return

    # Open webcam with better error handling
    print("Attempting to open webcam...")
    
    cap = None
    # Try different camera indices
    for camera_idx in [0, 1, 2]:
        print(f"Trying camera index {camera_idx}...")
        cap = cv2.VideoCapture(camera_idx)
        
        if cap.isOpened():
            # Test if we can actually read a frame
            ret, test_frame = cap.read()
            if ret:
                print(f"Successfully opened camera {camera_idx}")
                break
            else:
                cap.release()
                cap = None
        
        # Try different backends for this index
        if cap is None or not cap.isOpened():
            print(f"  Trying V4L2 backend for camera {camera_idx}...")
            cap = cv2.VideoCapture(camera_idx, cv2.CAP_V4L2)
            if cap.isOpened():
                ret, test_frame = cap.read()
                if ret:
                    print(f"Successfully opened camera {camera_idx} with V4L2")
                    break
                else:
                    cap.release()
                    cap = None
    
    # Set camera properties for better performance
    if cap is not None and cap.isOpened():
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
    
    if cap is None or not cap.isOpened():
        print("Error: Could not open webcam with any backend or index")
        print("Make sure your webcam is connected and not being used by another application")
        print("Available video devices found:")
        import glob
        for device in glob.glob('/dev/video*'):
            print(f"  {device}")
        return

    print("Webcam Animal Detection Started!")
    print("Press 'q' to quit")
    print("Press 'p' to pause/resume")
    print("Press 'c' to change confidence threshold")
    print("Press 'm' to cycle through models (n/s/m/l)")
    
    # Configuration
    confidence_threshold = 0.5  # Increased from 0.4 for better accuracy
    frame_skip = 2  # Process every 2nd frame for better performance
    paused = False
    available_models = ['yolov8n.pt', 'yolov8s.pt', 'yolov8m.pt', 'yolov8l.pt']
    current_model_idx = 1  # Start with yolov8s.pt
    
    # For statistics
    start_time = time.time()
    frame_count = 0
    processed_frames = 0
    animal_detections = defaultdict(int)
    fps_history = []
    last_max_animal = ""
    max_detection_count = 0
    last_status_print = time.time()
    
    # Update global variables for signal handler
    global_start_time = start_time
    global_animal_detections = animal_detections
    global_confidence_threshold = confidence_threshold
    
    while True:
        if not paused:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame from webcam")
                break
            frame_count += 1
            
            # Update global variables for signal handler
            global_frame_count = frame_count
            global_processed_frames = processed_frames
            # Only process every nth frame
            if frame_count % frame_skip == 0:
                processed_frames += 1
                # Perform detection with higher image size for better accuracy
                results = model(
                    frame, 
                    conf=confidence_threshold, 
                    classes=list(ANIMAL_CLASSES.keys()), 
                    verbose=False,
                    imgsz=640  # Higher resolution for better accuracy
                )
                # Process detections
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for box in boxes:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                            confidence = box.conf[0].cpu().numpy()
                            class_id = int(box.cls[0].cpu().numpy())
                            if class_id in ANIMAL_CLASSES:
                                animal_name = ANIMAL_CLASSES[class_id]
                                
                                # Additional confidence filtering for cats and dogs
                                if (class_id == 15 or class_id == 16) and confidence < 0.6:
                                    continue  # Skip low-confidence cat/dog detections
                                
                                animal_detections[animal_name] += 1
                                
                                # Check if this is now the most detected animal and save to JSON
                                if animal_detections[animal_name] > max_detection_count:
                                    max_detection_count = animal_detections[animal_name]
                                    if last_max_animal != animal_name:
                                        last_max_animal = animal_name
                                        # Create JSON for new top detection
                                        new_top_json = {
                                            "event": "new_top_detection",
                                            "timestamp": time.time(),
                                            "animal": animal_name,
                                            "detection_count": max_detection_count,
                                            "confidence": float(confidence)
                                        }
                                        detection_events.append(new_top_json)
                                        print(f"🏆 NEW TOP DETECTION: {animal_name} (detected {max_detection_count} times)")
                                
                                # Get color for this animal
                                color = COLORS.get(class_id, (0, 255, 0))
                                # Draw bounding box
                                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                                # Draw label with class ID for verification
                                if (class_id == 15 or class_id == 16):
                                    label = f"{animal_name}: {confidence:.2f} [HIGH-CONF]"
                                else:
                                    label = f"{animal_name}: {confidence:.2f}"
                                (text_width, text_height), _ = cv2.getTextSize(
                                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                                )
                                # Draw background for text
                                cv2.rectangle(
                                    frame, 
                                    (x1, y1 - text_height - 10), 
                                    (x1 + text_width, y1), 
                                    color, 
                                    -1
                                )
                                # Draw text
                                cv2.putText(
                                    frame, label, (x1, y1 - 5), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
                                )
                # Calculate FPS
                elapsed_time = time.time() - start_time
                current_fps = processed_frames / elapsed_time if elapsed_time > 0 else 0
                fps_history.append(current_fps)
                if len(fps_history) > 10:
                    fps_history.pop(0)
                avg_fps = sum(fps_history) / len(fps_history) if fps_history else 0
                
                # Save periodic status update to JSON (every 10 seconds)
                current_time = time.time()
                if current_time - last_status_print >= 10.0 and animal_detections:
                    most_detected = max(animal_detections.items(), key=lambda x: x[1])
                    total_detections = sum(animal_detections.values())
                    # Create periodic status JSON
                    status_json = {
                        "event": "periodic_status",
                        "timestamp": current_time,
                        "current_leader": {
                            "animal": most_detected[0],
                            "count": most_detected[1],
                            "total_detections": total_detections,
                            "percentage": round((most_detected[1]/total_detections)*100, 1)
                        },
                        "all_detections": dict(animal_detections)
                    }
                    detection_events.append(status_json)
                    print(f"📊 Current Leader: {most_detected[0]} ({most_detected[1]}/{total_detections} detections)")
                    last_status_print = current_time
                
                # Display FPS
                cv2.putText(
                    frame, f"FPS: {avg_fps:.1f}", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2
                )
                # Display confidence threshold and current model
                cv2.putText(
                    frame, f"Conf: {confidence_threshold} | Model: {available_models[current_model_idx]}", (10, 60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2
                )
                # Display detection status
                status = "PAUSED" if paused else "LIVE"
                cv2.putText(
                    frame, f"Status: {status}", (10, 90), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if paused else (0, 255, 0), 2
                )
                # Display animal detection counts (top 3)
                sorted_animals = sorted(animal_detections.items(), key=lambda x: x[1], reverse=True)[:3]
                y_offset = 120
                for animal, count in sorted_animals:
                    cv2.putText(
                        frame, f"{animal}: {count}", (10, y_offset), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2
                    )
                    y_offset += 25
            # Display frame and handle keyboard input
            try:
                cv2.imshow('Webcam Animal Detection', frame)
                key = cv2.waitKey(1) & 0xFF
            except cv2.error as e:
                print(f"Display error: {e}")
                print("OpenCV display failed. Consider using a different display method.")
                key = ord('q')  # Force quit if display fails
                
            if key == ord('q'):  # Quit
                break
            elif key == ord('p'):  # Pause/Resume
                paused = not paused
                print(f"Detection {'paused' if paused else 'resumed'}")
            elif key == ord('c'):  # Change confidence
                confidence_threshold = max(0.1, min(0.9, confidence_threshold + 0.1))
                if confidence_threshold > 0.9:
                    confidence_threshold = 0.1
                print(f"Confidence threshold set to: {confidence_threshold}")
            elif key == ord('m'):  # Cycle through models
                current_model_idx = (current_model_idx + 1) % len(available_models)
                new_model = available_models[current_model_idx]
                print(f"Switching to model: {new_model}")
                try:
                    model = YOLO(new_model)
                    print(f"Successfully loaded {new_model}")
                except Exception as e:
                    print(f"Error loading {new_model}: {e}")
                    # Revert to previous model
                    current_model_idx = (current_model_idx - 1) % len(available_models)
            elif key == ord('+'):  # Increase frame processing
                frame_skip = max(1, frame_skip - 1)
                print(f"Processing every {frame_skip} frame(s)")
            elif key == ord('-'):  # Decrease frame processing
                frame_skip = min(5, frame_skip + 1)
                print(f"Processing every {frame_skip} frame(s)")
        else:
            # Even when paused, still handle keyboard input
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):  # Quit
                break
            elif key == ord('p'):  # Pause/Resume
                paused = not paused
                print(f"Detection {'paused' if paused else 'resumed'}")
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    
    # Save final results
    save_json_output(output_file, detection_events, start_time, animal_detections, 
                    frame_count, processed_frames, confidence_threshold)

if __name__ == "__main__":
    main()