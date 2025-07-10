#!/usr/bin/env python3
"""
Test different OpenAI models for speed comparison
"""

import time
from openai import OpenAI

client = OpenAI()

def test_model_speed(model_name, test_name="Simple"):
    """Test speed of a specific model"""
    print(f"Testing {model_name} ({test_name})...", end=" ")
    
    start = time.time()
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Write a short bio of an artist in 2 sentences."}
            ],
            max_tokens=100,
            temperature=0.1
        )
        duration = (time.time() - start) * 1000
        
        # Check if response is reasonable
        content = response.choices[0].message.content
        word_count = len(content.split())
        
        print(f"{duration:.0f}ms ✅ ({word_count} words)")
        return duration, None
        
    except Exception as e:
        duration = (time.time() - start) * 1000
        print(f"{duration:.0f}ms ❌ Error: {str(e)[:40]}...")
        return duration, str(e)

def test_structured_output(model_name):
    """Test structured output capability (your use case)"""
    print(f"Testing {model_name} (Structured)...", end=" ")
    
    start = time.time()
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system", 
                    "content": "You are a JSON generator. Always respond with valid JSON only."
                },
                {
                    "role": "user", 
                    "content": 'Create a JSON object with fields: {"name": "artist name", "year": "birth year", "medium": "primary medium"}'
                }
            ],
            max_tokens=100,
            temperature=0.1
        )
        duration = (time.time() - start) * 1000
        
        # Try to parse as JSON
        content = response.choices[0].message.content
        try:
            import json
            json.loads(content)
            print(f"{duration:.0f}ms ✅ (Valid JSON)")
        except:
            print(f"{duration:.0f}ms ⚠️ (Invalid JSON)")
            
        return duration, None
        
    except Exception as e:
        duration = (time.time() - start) * 1000
        print(f"{duration:.0f}ms ❌ Error: {str(e)[:40]}...")
        return duration, str(e)

if __name__ == "__main__":
    print("🏃‍♂️ OpenAI Model Speed Test")
    print("=" * 50)
    
    models_to_test = [
        "gpt-3.5-turbo",     # Fastest traditional model
        "gpt-4o-mini",       # Your current choice  
        "gpt-4.1-mini",      # New 4.1 series mini (potentially faster)
        "gpt-4.1-nano",      # New 4.1 series nano (fastest 4.1 model)
        "gpt-4o",            # Slower but higher quality
    ]
    
    results = {}
    
    print("\n📝 Simple Text Generation Test:")
    print("-" * 30)
    for model in models_to_test:
        duration, error = test_model_speed(model, "Simple")
        results[model] = {"simple": duration, "error": error}
        time.sleep(1)  # Be nice to API
    
    print("\n🔧 Structured Output Test:")
    print("-" * 30)
    for model in models_to_test:
        duration, error = test_structured_output(model)
        if model in results:
            results[model]["structured"] = duration
        time.sleep(1)
    
    print(f"\n📊 Summary (Current OpenAI Performance):")
    print("-" * 50)
    
    fastest_simple = min(results.values(), key=lambda x: x["simple"] if x.get("simple") else float('inf'))
    
    for model, data in results.items():
        simple_ms = data.get("simple", 0)
        structured_ms = data.get("structured", 0)
        
        if data.get("error"):
            print(f"{model:15}: ERROR - {data['error'][:30]}...")
        else:
            # Show relative speed
            if simple_ms == fastest_simple["simple"]:
                speed_indicator = "🏆 FASTEST"
            elif simple_ms < fastest_simple["simple"] * 1.5:
                speed_indicator = "🥈 FAST"  
            else:
                speed_indicator = "🐌 SLOW"
                
            print(f"{model:15}: {simple_ms:.0f}ms simple, {structured_ms:.0f}ms structured {speed_indicator}")
    
    print(f"\n💡 Recommendation:")
    print(f"   • For maximum speed: Try gpt-4.1-nano (fastest 4.1 model)")
    print(f"   • For balanced speed: Try gpt-4.1-mini or gpt-4o-mini") 
    print(f"   • For legacy speed: Try gpt-3.5-turbo if quality is acceptable")
    print(f"   • For quality: Consider gpt-4o if speed is less critical")
    print(f"   • Note: GPT-4.1 models have 1M+ token context vs 128K for 4o models") 