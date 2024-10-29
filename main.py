from flask import Flask, render_template, request, jsonify, session, Response, stream_with_context
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

# Load environment variables from .env file
load_dotenv()

# Initialize Flask and OpenAI
app = Flask(__name__, static_url_path='/static')
app.secret_key = os.urandom(24)
client = OpenAI()

@app.route('/')
def home():
    # Initialize new chat session
    session['messages'] = [
        {"role": "system", "content": "You are a concise assistant. Keep responses brief and to the point."}
    ]
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json['message']
    
    # Get or initialize message history
    messages = session.get('messages', [
        {"role": "system", "content": "You are a concise assistant. Keep responses brief and to the point."}
    ])
    
    # Add user message
    messages.append({"role": "user", "content": user_message})
    
    def generate():
        # Create streaming response
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages.copy(),
            temperature=1,
            max_tokens=2048,
            stream=True
        )
        
        collected_chunks = []
        
        # Stream each chunk
        for chunk in response:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                collected_chunks.append(content)
                yield f"data: {json.dumps({'content': content})}\n\n"
        
        # Save complete message to session
        complete_message = ''.join(collected_chunks)
        messages.append({"role": "assistant", "content": complete_message})
        session['messages'] = messages
        session.modified = True

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)