from flask import Flask, render_template, request, jsonify, session
from openai import OpenAI
from dotenv import load_dotenv
import os

# Load environment variables from .env file (including API key)
load_dotenv()

# Initialize Flask web application and OpenAI client
app = Flask(__name__)
app.secret_key = os.urandom(24)  # Generate random secret key for session security
client = OpenAI()

@app.route('/')
def home():
    # When user first visits the page, initialize a new chat session
    # with a system message that sets the AI's behavior
    session['messages'] = [
        {"role": "system", "content": "You are a concise assistant. Keep responses brief and to the point."}
    ]
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    # Get the message sent by user from the POST request
    user_message = request.json['message']
    
    # If session doesn't exist (e.g., expired), create a new one
    if 'messages' not in session:
        session['messages'] = [
            {"role": "system", "content": "You are a concise assistant. Keep responses brief and to the point."}
        ]
    
    # Add the user's message to conversation history
    session['messages'].append({"role": "user", "content": user_message})
    
    # Send the entire conversation history to OpenAI API
    # This allows the AI to maintain context of the conversation
    response = client.chat.completions.create(
        model="gpt-4",
        messages=session['messages'],
        temperature=1,      # Controls randomness (1 = more creative)
        max_tokens=2048    # Maximum length of response
    )
    
    # Extract the AI's response and add it to conversation history
    assistant_message = response.choices[0].message.content.strip()
    session['messages'].append({"role": "assistant", "content": assistant_message})
    
    # Mark the session as modified so Flask saves it
    session.modified = True
    
    # Send the AI's response back to the frontend
    return jsonify({'response': assistant_message})

# Run the Flask application in debug mode if this file is run directly
if __name__ == '__main__':
    app.run(debug=True)
