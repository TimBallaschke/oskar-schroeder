#!/usr/bin/env python3
"""
OpenAI Connection Speed Monitor
Tests connection speed to OpenAI API and helps identify performance issues
"""

import requests
import time
import json
from datetime import datetime
from statistics import mean, median

def test_connection_speed(num_tests=5):
    """Test connection speed to OpenAI API"""
    print(f"🔍 Testing OpenAI API connection speed ({num_tests} tests)...")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 50)
    
    times = []
    
    for i in range(num_tests):
        try:
            start_time = time.time()
            
            # Test basic connectivity to OpenAI API
            response = requests.get(
                "https://api.openai.com",
                timeout=10,
                headers={"User-Agent": "Connection-Test/1.0"}
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to ms
            times.append(response_time)
            
            print(f"Test {i+1}: {response_time:.0f}ms - Status: {response.status_code}")
            
        except requests.exceptions.Timeout:
            print(f"Test {i+1}: TIMEOUT (>10s)")
        except requests.exceptions.RequestException as e:
            print(f"Test {i+1}: ERROR - {str(e)}")
        
        if i < num_tests - 1:  # Don't sleep after the last test
            time.sleep(1)
    
    if times:
        print("-" * 50)
        print(f"📊 Results Summary:")
        print(f"   Average: {mean(times):.0f}ms")
        print(f"   Median:  {median(times):.0f}ms")
        print(f"   Min:     {min(times):.0f}ms") 
        print(f"   Max:     {max(times):.0f}ms")
        
        # Performance assessment
        avg_time = mean(times)
        if avg_time < 100:
            print(f"   Status:  🟢 EXCELLENT (< 100ms)")
        elif avg_time < 200:
            print(f"   Status:  🟡 GOOD (100-200ms)")
        elif avg_time < 500:
            print(f"   Status:  🟠 FAIR (200-500ms)")
        else:
            print(f"   Status:  🔴 SLOW (> 500ms)")
    else:
        print("❌ All tests failed - check your internet connection")

def test_actual_api_speed():
    """Test actual OpenAI API response speed (requires API key)"""
    try:
        from openai import OpenAI
        import os
        
        # Only run if API key is available
        if not os.getenv('OPENAI_API_KEY'):
            print("⚠️  OPENAI_API_KEY not found - skipping API test")
            return
            
        client = OpenAI()
        print("\n🤖 Testing actual OpenAI API response speed...")
        
        start_time = time.time()
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        
        end_time = time.time()
        api_time = (end_time - start_time) * 1000
        
        print(f"   API Response: {api_time:.0f}ms")
        
        if api_time < 300:
            print(f"   Status: 🟢 FAST")
        elif api_time < 800:
            print(f"   Status: 🟡 NORMAL")
        else:
            print(f"   Status: 🔴 SLOW")
            
    except ImportError:
        print("⚠️  OpenAI library not installed - skipping API test")
    except Exception as e:
        print(f"❌ API test failed: {str(e)}")

def get_time_based_advice():
    """Provide advice based on current time"""
    current_hour = datetime.now().hour
    
    print(f"\n💡 Performance Tips for {current_hour:02d}:00:")
    
    if 6 <= current_hour <= 10:
        print("   🟢 OPTIMAL TIME - Usually fastest API responses")
    elif 15 <= current_hour <= 22:
        print("   🟡 PEAK HOURS - Expect slower responses (US business hours)")
        print("   💡 Try using smaller prompts or lower max_tokens")
    elif 2 <= current_hour <= 6:
        print("   🟢 EXCELLENT TIME - Global minimum usage")
    else:
        print("   🟡 MODERATE TIME - Average performance expected")

if __name__ == "__main__":
    print("🌐 OpenAI Connection Speed Monitor")
    print("=" * 50)
    
    test_connection_speed(5)
    test_actual_api_speed()
    get_time_based_advice()
    
    print(f"\n📝 Tips to improve speed:")
    print(f"   • Use this tool at different times to see patterns")
    print(f"   • If consistently slow, try: smaller prompts, lower max_tokens")
    print(f"   • Best times: 6-10 AM or 2-6 AM German time") 