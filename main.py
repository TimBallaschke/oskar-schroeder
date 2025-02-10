from flask import Flask, render_template, request, jsonify, session, Response, stream_with_context
from flask_session import Session  # Import Session from flask_session
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from pydantic import BaseModel, Field
from typing import List, Union, Literal, Annotated, Optional
from enum import Enum
from datetime import datetime
from prompts import prompts  # Import the prompts dictionary
# Load environment variables from .env file (including API key)
load_dotenv()

# INITIALIZE FLASK APPLICATION AND OPENAI CLIENT

# Create Flask app instance with static file path
# In Flask, an app instance is the main object created when initializing the application.
# It represents the application and manages its settings, routes, and configurations;
# __name__ is the name of the module; a module is a file containing Python code;
# static_url_path is the path to the static files like CSS, JS, images, etc.
app = Flask(__name__, static_url_path='/static')
# Set random secret key for session management
# secret key is an attribute of the Flask app instance;
# urandom is a function in the os module that generates a random byte string of a given length;
# 24 is the length of the byte string in bytes
app.secret_key = os.urandom(24)

# Configure server-side session
app.config['SESSION_TYPE'] = 'filesystem'  # You can also use 'redis', 'memcached', etc.
app.config['SESSION_FILE_DIR'] = './flask_session/'  # Directory to store session files
app.config['SESSION_PERMANENT'] = False
Session(app)  # Initialize the session with the app

# Initialize OpenAI client
client = OpenAI()

#PYDANTIC MODELS

# BaseComponent defines the shared structure for all components.
# Individual Component Classes define specific types of UI components.
# ComponentUnion allows a list to contain different types of components.
# Response combines everything into a structured response that can be sent to the front end.

    
class ParagraphComponent(BaseModel):
    UIType: Literal["paragraphs"] = Field(description="Indicates this is a paragraph component for displaying text")
    text: List[str] = Field(description="The text content of the paragraph. Every sentence should be a separate paragraph.")
    # images: ImagesComponent = Field(description="Images to the paragraph")

class ListComponent(BaseModel):
    UIType: Literal["list"] = Field(description="Indicates this is a list component for displaying a list of items")
    items: List[str] = Field(description="A list of text items to be displayed")

class TableComponent(BaseModel):
    UIType: Literal["table"] = Field(description="Indicates this is a table component for displaying structured data")
    headers: List[str] = Field(description="Column headers for the table")
    rows: List[List[str]] = Field(description="Rows of data, where each row is a list of strings")

class ProjectsLayout(str, Enum):
    fullscreen = "fullscreen"
    grid = "grid"

class ProjectComponent(BaseModel):
    UIType: Literal["project"] = Field(description="Indicates this is a project component that represents an artwork or installation")
    name: str = Field(description="Name of the project or artwork")
    year: str = Field(description="Year the project was created")
    material: str = Field(description="Primary material used in the project")
    dimensions: str = Field(description="Physical dimensions of the project")
    images: List[str] = Field(description="A list of URLs for images")
    description: Optional[List[str]] = Field(
        description=(
            "A detailed project description of about 4-8 sentences. Provide this only when the user explicitly requests additional details. "
            "Do not include an extended narrative unless it is specifically asked for."
        )
    )

class ProjectsList (BaseModel):
    UIType: Literal["projects_list"] = Field(description="Indicates this is a projects list component for displaying a list of projects")
    layout: ProjectsLayout = Field(
        default=ProjectsLayout.fullscreen,
        description=(
            "Display layout for projects. Defaults to 'fullscreen' to show detailed views of individual projects. "
            "Switch to 'grid' layout only when the user explicitly requests an overview, filtering, or comparative view "
            "(for example, 'show all projects made out of wood')."
        )
    )
    projects: List[ProjectComponent] = Field(description="A list of projects to be displayed")

# Root level must be a simple object
class Response_1(BaseModel):
    type: Literal["response"] = "response"  # Literal makes sure only a certain value is allowed for the type field / Fixed type to ensure root level is a simple object (not a descriminated union)
    components: List[Union[ParagraphComponent, ListComponent, TableComponent, ProjectsList]] = Field( # Union allows for a list of different types of components / basically presents a list of options
        description="List of UI components that make up the response"
    )

class Response_2(BaseModel):
    content_description: str = Field(description="A description of the content that is currently displayed")
    prompt_proposal_1: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")
    prompt_proposal_2: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")
    prompt_proposal_3: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")
    prompt_proposal_4: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")

class Response_3(BaseModel):
    type: Literal["response"] = "response"  # Literal makes sure only a certain value is allowed for the type field / Fixed type to ensure root level is a simple object (not a descriminated union)
    components: Union[ParagraphComponent, ListComponent, TableComponent, ProjectComponent] = Field( # Union allows for a list of different types of components / basically presents a list of options
        description="ReworkedUI component that make up the response"
    )





# SYSTEM PROMPTS



# @app.route is provided by Flask and used to define a route;
# '/': This string represents the URL path for the route;
# '/' is typically the home page of a web application;
# When a user accesses this path, the function below will execute;
# handles initial page load/function below is executed when user accesses the home page
@app.route('/')
def index():
    # When user first visits the page, initialize a new chat session
    # with a system message that sets the AI's behavior
    # {} holds a dictionary in python
    # [] holds a list in python (used to store key-value pairs – comparable to objects in JavaScript)
    session['messages_1'] = [prompts["SYSTEM_PROMPT_1"]]
    session['messages_2'] = [prompts["SYSTEM_PROMPT_2"]]
    session['messages_3'] = [prompts["SYSTEM_PROMPT_3"]]
    # Render the main chat interface (render_template is a function in Flask that locates and loads an HTML File)
    return render_template('index.html')


# Define route for api endpoint, accepting POST requests;
# POST requests are used to send data to the server, such as form submissions, file uploads, or API requests;
@app.route('/content', methods=['POST'])
def content():
    user_message = request.json['message']
    
    # Initialize message list if not in session
    if 'messages_1' not in session:
        session['messages_1'] = [prompts["SYSTEM_PROMPT_1"]]

    # Get current messages from session
    messages_1 = session['messages_1']
    # Append user message
    messages_1.append({"role": "user", "content": user_message})
    
    session.modified = True
    
    return jsonify({"status": "ok"})  # Respond to confirm the message was received

@app.route('/stream')
def stream():
    messages_1 = session.get('messages_1', [])

    def generate():
        with client.beta.chat.completions.stream(
            model="gpt-4o-mini",
            messages=messages_1,
            temperature=0.5,
            max_tokens=2048,
            response_format=Response_1,
        ) as stream:
            for event in stream:
                if event.type == "content.delta":
                    if event.parsed is not None:
                        # Send the parsed delta to the frontend
                        # yield is used to send data to the frontend in a streaming manner (turns function into a generator)
                        # a function is creating all values at once, but a generator sends them one by one
                        print(json.dumps(event.parsed, indent=2))
                        yield f"data: {json.dumps({'type': 'delta', 'content': event.parsed})}\n\n"
                elif event.type == "content.done":
                    # Get and send the final completion
                    final_completion = stream.get_final_completion().choices[0].message.parsed
                    
                    # Append assistant's response to conversation history
                    messages_1.append({
                        "role": "assistant", 
                        "content": json.dumps(final_completion.model_dump())
                    })
                    
                    # Mark session as modified
                    session.modified = True
                    
                    # Send completion event to frontend
                    yield f"data: {json.dumps({'type': 'complete', 'content': final_completion.model_dump()})}\n\n"

                    # Call the second chatbot
                    yield from handle_second_chatbot(final_completion)

                    
                elif event.type == "error":
                    # Send error event to frontend
                    yield f"data: {json.dumps({'type': 'error', 'content': str(event.error)})}\n\n"

    # response() ia a flask function that returns a HTTP response object
    # it allows you to customize how data is sent back to the client
    # it is more flexible than a simple return statement
    # stream_with_context() is a flask function that that preserves the current context while streaming data
    # generate() is a generator function that yields data to the client
    # content_type="text/event-stream" specifies the content type of the response
    # this tells the browser that the response is an event stream
    # the browser will use this information to handle the response as an event stream
    return Response(stream_with_context(generate()), content_type="text/event-stream")

def handle_second_chatbot(final_completion):
    if 'messages_2' not in session:
        session['messages_2'] = [prompts["SYSTEM_PROMPT_2"]]

    messages_2 = session.get('messages_2', [])
    
    # Pass the final completion from chatbot 1 as input to chatbot 2
    messages_2.append({
        "role": "user",
        "content": json.dumps(final_completion.model_dump())  # Ensure it's in the right format
    })

    try:

        print("\n=== Second Chatbot Input ===")
        print(json.dumps(final_completion.model_dump(), indent=2))
    
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=messages_2,
            temperature=0.5,
            max_tokens=2048,
            response_format=Response_2,
        )

        second_response = response.choices[0].message.parsed

        print("\n=== Second Chatbot Raw Response ===")
        print(second_response)

        print("\n=== Second Chatbot Parsed Response ===")
        print(json.dumps(second_response.model_dump(), indent=2))

        # Append chatbot 2's response to session
        messages_2.append({
            "role": "assistant",
            "content": json.dumps(second_response.model_dump())
        })
        session.modified = True

        # Send chatbot 2's response to the frontend (not streamed)
        yield f"data: {json.dumps({'type': 'second_complete', 'content': second_response.model_dump()})}\n\n"

    except Exception as e:
        print("\n=== Second Chatbot Error ===")
        print(str(e))
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

@app.route('/content3', methods=['POST'])
def content3():
    user_message = request.json['message']
    
    # Initialize message list for chatbot 3 if not in session
    if 'messages_3' not in session:
        session['messages_3'] = [prompts["SYSTEM_PROMPT_3"]]
    
    messages_3 = session['messages_3']
    messages_3.append({"role": "user", "content": user_message})
    session.modified = True
    
    return jsonify({"status": "ok"})

@app.route('/stream3')
def stream3():
    messages_3 = session.get('messages_3', [])
    
    def generate():
        with client.beta.chat.completions.stream(
            model="gpt-4o-mini",
            messages=messages_3,
            temperature=0.5,
            max_tokens=2048,
            response_format=Response_3,
        ) as stream:
            for event in stream:
                if event.type == "content.delta":
                    if event.parsed is not None:
                        print("\n=== Delta Update ===")
                        print(json.dumps(event.parsed, indent=2))
                        yield f"data: {json.dumps({'type': 'delta', 'content': event.parsed})}\n\n"
                elif event.type == "content.done":
                    final_completion = stream.get_final_completion().choices[0].message.parsed
                    print("\n=== Final Completion ===")
                    print(json.dumps(final_completion.model_dump(), indent=2))

                    messages_3.append({
                        "role": "assistant",
                        "content": json.dumps(final_completion.model_dump())
                    })
                    session.modified = True
                    yield f"data: {json.dumps({'type': 'complete', 'content': final_completion.model_dump()})}\n\n"
                elif event.type == "error":
                    yield f"data: {json.dumps({'type': 'error', 'content': str(event.error)})}\n\n"
    
    return Response(stream_with_context(generate()), content_type="text/event-stream")


# Run the Flask application if this file is run directly
# this condition checks if the script is being run directly (not imported as a module in another script);
# if __name__ is '__main__', it means the script is being run directly; 
# not necessary in this case, but good practice to have
if __name__ == '__main__':
    # app.run() is a method that starts the Flask development server;
    # debug=True enables debug mode, which provides detailed error messages and automatic reloading;
    # host='127.0.0.1' specifies the host address to bind the server to (localhost);
    # port=5000 specifies the port number to bind the server to (5000 is the default port for Flask development servers)
    app.run(debug=True, host='127.0.0.1', port=5000)  