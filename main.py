# Import necessary libraries
from flask import Flask, render_template, request, jsonify, session, Response, stream_with_context  # Flask web framework components
from openai import OpenAI  # OpenAI API client
from dotenv import load_dotenv  # For loading environment variables
import os  # For operating system related functions (used for random key generation)
import json  # For JSON handling

# Load environment variables from .env file (like API keys)
load_dotenv()

# Initialize Flask application and OpenAI client
app = Flask(__name__, static_url_path='/static')  # Create Flask app instance with static file path (In Flask, an app instance is the main object created when initializing the application. It represents the application and manages its settings, routes, and configurations; __name__ is the name of the module; a module is a file containing Python code; static_url_path is the path to the static files like CSS, JS, images, etc.)
app.secret_key = os.urandom(24)  # Set random secret key for session management (secret key is an attribute of the Flask app instance; urandom is a function in the os module that generates a random byte string of a given length; 24 is the length of the byte string in bytes)
client = OpenAI()  # Initialize OpenAI client


@app.route('/')  # Define route for home page (@app.route is provided by Flask and used to define a route; '/': This string represents the URL path for the route. '/' is typically the home page of a web application. When a user accesses this path, the function below will execute. A user accesses a path in a Flask (or any web) application by entering a URL in their web browser)
def home(): # Defines the function that Flask will run whenever the root URL ('/') is requested.
    # Initialize new chat session with system message
    session['messages'] = [ # (In Flask, session is a secure, dictionary-like object that stores data across requests for each user, allowing information (like preferences or session data) to persist throughout a user’s visit; messages is a key in the session dictionary that stores the conversation history)
        {"role": "system", "content": "You are a concise assistant. Keep responses brief and to the point."} # (This dictionary is the first message in the conversation history and provides instructions to the AI model)
    ]
    return render_template('index.html')  # Render the main chat interface (render_template is a function in Flask that locates and loads an HTML File)

@app.route('/chat', methods=['POST'])  # Define route for chat endpoint, accepting POST requests (POST requests are used to send data to the server, such as form submissions, file uploads, or API requests; a post request triggers the function below)
def chat(): # function
    user_message = request.json['message']  # Get message from POST request JSON (Filtering the message from the JSON that is sent with the POST request)
    
    # Get existing message history or create new one with system message
    messages = session.get('messages', [
        {"role": "system", "content": "You are a concise assistant. Keep responses brief and to the point."}
    ])
    
    # Add user's message to the conversation history
    messages.append({"role": "user", "content": user_message})
    
    # function for generating a streaming response from the OpenAI API
    def generate():
        # Create streaming response from OpenAI API 
        response = client.chat.completions.create( # response is a variable that stores the streaming response from the OpenAI API
            model="gpt-4o-mini",  # Specify the AI model to use
            messages=messages.copy(),  # Pass conversation history through a copy to avoid modifying the original list (OpenAI API may mutate the messages)
            temperature=1,  # Control randomness (1 is more random)
            max_tokens=2048,  # Maximum length of response
            stream=True  # Enable streaming response (streaming allows the server to send data to the client in chunks, which can be useful for chat applications where the response is generated over time)
        )
        
        collected_chunks = []  # Initialize list to collect response chunks (used for streaming response in chunks)
        
        # Process each chunk of the streaming response
        for chunk in response:
            if chunk.choices[0].delta.content is not None: # If the chunk has content
                content = chunk.choices[0].delta.content  # Get content from chunk
                collected_chunks.append(content)  # Add to collected chunks
                yield f"data: {json.dumps({'content': content})}\n\n"  # Send chunk to client
        
        # After streaming complete, save the full conversation
        complete_message = ''.join(collected_chunks)  # Join all chunks
        messages.append({"role": "assistant", "content": complete_message})  # Add to message history
        session['messages'] = messages  # Update session with new messages
        session.modified = True  # Mark session as modified

    # Return streaming response
    return Response(stream_with_context(generate()), mimetype='text/event-stream') # (Response() is a Flask class that creates a new HTTP response; stream_with_context() is a Flask function that allows the streaming response to be sent with the current context; generate() is the function that generates the streaming response (defined above); mimetype='text/event-stream' specifies the MIME type of the response, which is used to indicate the type of data being sent)

# Run the Flask application if this file is run directly
if __name__ == '__main__': #this condition checks if the script is being run directly (not imported as a module in another script); if __name__ is '__main__', it means the script is being run directly; 
    app.run(debug=True, host='127.0.0.1', port=5000)  # app.run() is a method that starts the Flask development server; debug=True enables debug mode, which provides detailed error messages and automatic reloading; host='127.0.0.1' specifies the host address to bind the server to (localhost); port=5000 specifies the port number to bind the server to (5000 is the default port for Flask development servers)