#!/usr/bin/env python3
"""
SkyJet Airlines Chatbot - Complete Accuracy Testing Suite
This script runs all accuracy and classification tests
"""

import subprocess
import sys
import time
import os
import requests
from datetime import datetime

def check_server():
    """Check if the backend server is running"""
    try:
        response = requests.get("http://localhost:8000/docs")
        return True
    except:
        return False

def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(f" {text}")
    print("=" * 70)

def main():
    print_header("🚀 SKYJET AIRLINES - COMPLETE ACCURACY TEST SUITE")
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if server is running
    print("\n🔍 Checking backend server...")
    if not check_server():
        print("❌ Backend server is not running!")
        print("   Please start the server with:")
        print("   python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
    print("✅ Backend server is running")
    
    # Run classification metrics test
    print_header("📊 TEST 1: CLASSIFICATION METRICS")
    print("Running precision, recall, F1, and confusion matrix evaluation...\n")
    time.sleep(1)
    
    try:
        subprocess.run([sys.executable, "classification_metrics.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Classification metrics test failed: {e}")
    
    # Run basic accuracy test
    print_header("📈 TEST 2: BASIC ACCURACY TEST")
    print("Running basic accuracy and response time tests...\n")
    time.sleep(1)
    
    try:
        subprocess.run([sys.executable, "test_accuracy.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Accuracy test failed: {e}")
    
    # Run load test
    print_header("⚡ TEST 3: LOAD TEST")
    print("Simulating concurrent users...\n")
    time.sleep(1)
    
    try:
        subprocess.run([sys.executable, "load_test.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Load test failed: {e}")
    
    # Generate dashboard if classification metrics ran successfully
    if os.path.exists("metrics_dashboard.py"):
        print_header("📊 GENERATING PERFORMANCE DASHBOARD")
        try:
            subprocess.run([sys.executable, "metrics_dashboard.py"], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Dashboard generation failed: {e}")
    
    print_header("✅ ALL TESTS COMPLETED")
    print("\n📁 Generated files:")
    
    # List all generated reports
    report_files = []
    for file in os.listdir('.'):
        if any(file.startswith(prefix) for prefix in 
               ['classification_report', 'accuracy_report', 'load_test', 
                'confusion_matrix', 'metrics_visualization', 'dashboard']):
            report_files.append(f"   • {file}")
    
    if report_files:
        print("\n".join(report_files))
    else:
        print("   No report files found")
    
    print("\n🎯 Next Steps:")
    print("   1. Review the confusion matrix PNG file")
    print("   2. Check classification_report.json for detailed metrics")
    print("   3. Analyze misclassifications and improve intent detection")
    print("   4. Run tests again after making improvements")

if __name__ == "__main__":
    main()