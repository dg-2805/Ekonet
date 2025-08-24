#!/usr/bin/env python3
"""
Test script to verify IP camera functionality with YOLO detection
"""

import cv2
import requests
import time
import sys

def test_ip_camera_connection(ip_url):
    """Test if we can connect to the IP camera"""
    print(f"Testing connection to: {ip_url}")
    
    try:
        # Try to open the IP camera stream
        cap = cv2.VideoCapture(ip_url)
        
        if not cap.isOpened():
            print(f"❌ Failed to open IP camera at {ip_url}")
            return False
        
        # Try to read a frame
        ret, frame = cap.read()
        if not ret:
            print(f"❌ Failed to read frame from {ip_url}")
            cap.release()
            return False
        
        print(f"✅ Successfully connected to IP camera at {ip_url}")
        print(f"   Frame shape: {frame.shape}")
        cap.release()
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to IP camera: {e}")
        return False

def test_backend_ip_camera(ip_url):
    """Test backend IP camera processing"""
    print(f"\nTesting backend IP camera processing...")
    
    try:
        # Test setting IP camera URL
        response = requests.get(f"http://localhost:5002/webcam/start?source={ip_url}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend accepted IP camera URL")
            print(f"   Response: {data}")
            return True
        else:
            print(f"❌ Backend rejected IP camera URL: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing backend: {e}")
        return False

def main():
    # Test IP camera URL (adjust as needed)
    ip_url = "http://10.50.51.10:8080/video"
    
    print("🔍 Testing IP Camera Integration")
    print("=" * 50)
    
    # Test 1: Direct connection to IP camera
    print("\n1. Testing direct IP camera connection...")
    if test_ip_camera_connection(ip_url):
        print("✅ Direct connection successful")
    else:
        print("❌ Direct connection failed")
        print("   Make sure your phone's IP Webcam app is running")
        print("   Verify the IP address and port are correct")
        return
    
    # Test 2: Backend integration
    print("\n2. Testing backend integration...")
    if test_backend_ip_camera(ip_url):
        print("✅ Backend integration successful")
    else:
        print("❌ Backend integration failed")
        print("   Make sure the backend server is running on port 5002")
        return
    
    print("\n🎉 All tests passed! IP camera should work with YOLO detection.")
    print("\nNext steps:")
    print("1. Go to the Live Detection page")
    print("2. Select 'IP Camera' as source")
    print("3. Verify the URL is correct")
    print("4. Click 'Start IP Camera'")
    print("5. You should see the stream with YOLO detection boxes")

if __name__ == "__main__":
    main()
