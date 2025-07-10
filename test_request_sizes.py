import time
from openai import OpenAI

client = OpenAI()

print('🧪 Testing different request sizes...')
print('=' * 50)

tests = [
    ('Tiny (Hi)', [{'role': 'user', 'content': 'Hi'}], 5),
    ('Small (Hello)', [{'role': 'user', 'content': 'Hello world'}], 10),
    ('Medium', [{'role': 'user', 'content': 'Tell me about art in one sentence'}], 30)
]

for name, messages, max_tokens in tests:
    print(f'Testing {name}...', end=' ')
    start = time.time()
    
    try:
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=messages,
            max_tokens=max_tokens
        )
        duration = (time.time() - start) * 1000
        print(f'{duration:.0f}ms ✅')
        
    except Exception as e:
        duration = (time.time() - start) * 1000
        print(f'{duration:.0f}ms ❌ Error: {str(e)[:30]}...')
    
    time.sleep(1)  # Be nice to the API 