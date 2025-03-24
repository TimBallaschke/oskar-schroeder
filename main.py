from flask import Flask, render_template, request, jsonify, session, Response, stream_with_context
from flask_session import Session  # Import Session from flask_session
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from pydantic import BaseModel, Field
# from pydantic.generics import GenericModel
from typing import List, Union, Literal, Annotated, Optional, TypeVar, Generic
from enum import Enum
from datetime import datetime
from prompts import prompts  # Import the prompts dictionary
import sqlite3

# Load environment variables from .env file (including API key)
load_dotenv()









# ------------------------------------------------------------------------------------------------  
# HELPER FUNCTIONS
# ------------------------------------------------------------------------------------------------

# generate unique id for state storage
def generate_unique_id():
    """Generate a unique ID for state storage"""
    import time
    import random
    import string
    
    timestamp = int(time.time() * 1000)
    timestamp_part = format(timestamp, 'x')  # Convert to hex
    
    # Generate 5 random alphanumeric characters
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    
    return f"{timestamp_part}{random_part}"

# SQLITE DATABASE
DB_PATH = "state_data.db"  # Path to the database file

def create_table(): # Creates a table if it doesn't exist
    conn = sqlite3.connect(DB_PATH) # Connect to the database
    cursor = conn.cursor() # Cursor is used to execute SQL commands
    
    cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS states (
        id TEXT PRIMARY KEY,
        content TEXT
    );
    """)
    
    conn.commit()
    conn.close()


# Save state to database
def save_state(state_id, content):
    """Save state to database with error handling and connection management"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO states (id, content) VALUES (?, ?)",
            (state_id, content)
        )
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Database error saving state: {str(e)}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def get_state(state_id):
    """Retrieve state from database by ID"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT content FROM states WHERE id = ?", (state_id,))
        result = cursor.fetchone()
        
        return result[0] if result else None
    except Exception as e:
        print(f"Database error retrieving state: {str(e)}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()






# ------------------------------------------------------------------------------------------------  
# INITIALIZE FLASK APPLICATION AND OPENAI CLIENT
# ------------------------------------------------------------------------------------------------  


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




# ------------------------------------------------------------------------------------------------  
# PYDANTIC MODELS
# ------------------------------------------------------------------------------------------------  

# BaseComponent defines the shared structure for all components.
# Individual Component Classes define specific types of UI components.
# ComponentUnion allows a list to contain different types of components.
# Response combines everything into a structured response that can be sent to the front end.

    
class ParagraphComponent(BaseModel):
    UIType: Literal["paragraphs"] = Field(description="Indicates this is a paragraph component for displaying text")
    text: List[str] = Field(
        description=(
            "The text content of the paragraph. Each sentence should be a separate paragraph. "
            "Proper names should be wrapped in brackets, including names of individuals, locations, organizations, "
            "historical and cultural periods, artistic movements, theories, styles, significant events, and well-known works. "
            "For example: '[Zentrum für Zeitgenössische Kunst]', '[Donald Judd]', '[Barbara Hepworth]', '[Berlin]', "
            "'[Minimalism]', '[Renaissance]', '[documenta]', '[Conceptual Art]', '[Les Demoiselles d’Avignon]'."
        )
)    # images: ImagesComponent = Field(description="Images to the paragraph")

class ListItem(BaseModel):
    prefix: int = Field(description="A prefix for the list item. For example '2010', '2011', '2012' or '01', '02', '03' etc.")
    item: str = Field(description="The text content of the list item. Should be a bullet point 1-5 words long.")

class ListComponent(BaseModel):
    UIType: Literal["list"] = Field(description="Indicates this is a list component for displaying a list of items for example a cv")
    items: List[ListItem] = Field(description="A list of short text items to be displayed")

class TableComponent(BaseModel):
    UIType: Literal["table"] = Field(description="Indicates this is a table component for displaying structured data")
    headers: List[str] = Field(description="Column headers for the table. Headers should be single words when possible")
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

# FIRST CHATBOT

# Root level must be a simple object
class Response_1(BaseModel):
    type: Literal["response"] = "response"  # Literal makes sure only a certain value is allowed for the type field / Fixed type to ensure root level is a simple object (not a descriminated union)
    components: List[Union[ParagraphComponent, ListComponent, TableComponent, ProjectsList]] = Field( # Union allows for a list of different types of components / basically presents a list of options
        description="List of UI components that make up the response"
    )

# SECOND CHATBOT

class Response_2(BaseModel):
    content_description: str = Field(description="A description of the content that is currently displayed")
    prompt_proposal_1: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")
    prompt_proposal_2: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")
    prompt_proposal_3: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")
    prompt_proposal_4: str = Field(description="A recommendation to the user that offers suggestions or next steps based on the current content")



# THIRD CHATBOT

T = TypeVar("T")

# Create a generic wrapper that includes a value and a changed flag.
class ModifiedField(BaseModel, Generic[T]):
    changed: bool = Field(
        description="A boolean flag indicating whether the field's value has been changed compared to the original component."
    )
        
    value: T = Field(
        description="The new value for the field if modified."
    )


# Now update your ReworkedProjectComponent model using ModifiedField for each field.
class ReworkedProjectComponent(BaseModel):

    UIType: Literal["project"] = Field(description="Indicates this is a project component that represents an artwork or installation")

    name: Optional[ModifiedField[str]] = Field(
        description=(
            "The name of the project or artwork. "
        )
    )
    year: Optional[ModifiedField[str]] = Field(
        description=(
            "The year the project was created. "
        )
    )
    material: Optional[ModifiedField[str]] = Field(
        description=(
            "The primary material used in the project. "
        )
    )
    dimensions: Optional[ModifiedField[str]] = Field(
        description=(
            "The physical dimensions of the project. "
        )
    )
    images: Optional[ModifiedField[List[str]]] = Field(
        description=(
            "A list of URLs for images. "
        )
    )
    description: Optional[ModifiedField[List[str]]] = Field(
        description=(
            "A project description. Only provide if the user requests it. Every sentence should be a separate paragraph. Unless the user requests different the description should be 4-6 sentences long."
        )
    )

class Response_3(BaseModel):
    type: Literal["response"] = "response"  # Literal makes sure only a certain value is allowed for the type field / Fixed type to ensure root level is a simple object (not a descriminated union)
    component: ReworkedProjectComponent = Field( # Union allows for a list of different types of components / basically presents a list of options
        description="ReworkedUI component that make up the response"
    )



# ------------------------------------------------------------------------------------------------  
# CHATBOT ROUTES
# ------------------------------------------------------------------------------------------------
# FIRST & SECOND CHATBOT
# ------------------------------------------------------------------------------------------------

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
    session['messages_4'] = [prompts["SYSTEM_PROMPT_4"]]  # Store in session instead of local variable
    # Render the main chat interface (render_template is a function in Flask that locates and loads an HTML File)
    return render_template('index.html')


# Define route for api endpoint, accepting POST requests;
# POST requests are used to send data to the server, such as form submissions, file uploads, or API requests;
@app.route('/content', methods=['POST'])
def content():
    user_message = request.json['message']
    
    # Initialize message list if not in session
    if 'messages_1' not in session:
        session['messages_1'] = [["SYSTEM_PROMPT_1"]]

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
                    yield f"data: {json.dumps({'type': 'delta', 'content': {'type': 'response', 'components': [{'UIType': 'projects_list', 'projects': [{'UIType': 'project', 'stream_finished': 'true'}]}]}})}\n\n"

                    # Get and send the final completion
                    final_completion = stream.get_final_completion().choices[0].message.parsed

                    
                    # Append assistant's response to conversation history
                    messages_1.append({
                        "role": "assistant", 
                        "content": json.dumps(final_completion.model_dump())
                    })
                    
                    # Mark session as modified
                    session.modified = True
                    
                    # Send completion event to frontend with state_id
                    yield f"data: {json.dumps({'type': 'complete', 'content': final_completion.model_dump()})}\n\n"
                    # Call the second chatbot
                    yield from handle_second_chatbot(final_completion)



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

        # Save the state to the database
        state_id = generate_unique_id()
        # Create a combined content object with both responses for Database Storage
        combined_content = {
            "first_response": final_completion.model_dump(),
            "second_response": second_response.model_dump()
        }

        # Save both responses together
        if save_state(state_id, json.dumps(combined_content)):
            # Append chatbot 2's response to session
            messages_2.append({
                "role": "assistant",
                "content": json.dumps(second_response.model_dump())
            })
            session.modified = True

            # Send chatbot 2's response to the frontend with the state_id
            yield f"data: {json.dumps({'type': 'second_complete', 'content': second_response.model_dump(), 'stateId': state_id})}\n\n"
        else:
            # Still send the response but without stateId
            yield f"data: {json.dumps({'type': 'second_complete', 'content': second_response.model_dump(), 'error': 'Failed to save state'})}\n\n"

    except Exception as e:
        print("\n=== Second Chatbot Error ===")
        print(str(e))
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"


# ------------------------------------------------------------------------------------------------
# THIRD CHATBOT
# ------------------------------------------------------------------------------------------------

@app.route('/content3', methods=['POST'])
def content3():
    user_message = request.json['message']
    print(user_message)
    
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

# ------------------------------------------------------------------------------------------------  
# WEBSEARCH ROUTES
# ------------------------------------------------------------------------------------------------

@app.route('/content4', methods=['POST'])
def content4():
    user_message = request.json['message']
    print("--------------------------------")
    print("user_message")
    print(user_message)
    print("--------------------------------")

    session['messages_4'] = user_message

    session.modified = True             

    return jsonify({"status": "ok"})  # Respond to confirm the message was received

@app.route('/stream4')
def stream4():
    print("stream4")
    messages_4 = session.get('messages_4', [])
    
    def generate():
        stream = client.responses.create(
            model="gpt-4o-mini",
            tools=[
                {
                    "type": "web_search_preview",
                }
            ],
            input=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "input_text",
                            "text": "You are a helpful assistant. The user will provide you with short terms, names, "
                                    "or references — including people, places, events, organizations, or artistic concepts.\n\n"
                                    "For each input, provide a clear, short and concise description (1–3 sentences) to help "
                                    "the user understand what the term means or refers to.\n\n"
                                    "Always use your web search tool to include up-to-date and relevant information, "
                                    "especially for people, institutions, or events that may have recent developments.\n\n"
                                    "Your explanations should be factual, accessible, and easy to understand for a "
                                    "general audience. Avoid technical jargon unless it's essential.\n\n"
                                    "IMPORTANT: Do not include citations, links, or source references in your response. "
                                    "Do not use footnotes or annotations. Just provide the information directly.\n\n"
                                    "IMPORTANT: The description should be short and concise. 3 sentences max."
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": messages_4
                        }
                    ]
                }
            ],
            stream=True,
        )
        for event in stream:
            if event.type == "response.output_text.delta":
                yield f"data: {json.dumps({'type': 'delta', 'content': event.delta})}\n\n"
            elif event.type == "response.completed":
                yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return Response(stream_with_context(generate()), content_type="text/event-stream")





# ------------------------------------------------------------------------------------------------  
# DATABASE ROUTES
# ------------------------------------------------------------------------------------------------

@app.route('/get_state/<state_id>') 
def get_state_route(state_id):
    try:
        state_data = get_state(state_id)
        if state_data:
            return jsonify(json.loads(state_data))
        else:
            return jsonify({"error": "State not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500







# Run the Flask application if this file is run directly
# this condition checks if the script is being run directly (not imported as a module in another script);
# if __name__ is '__main__', it means the script is being run directly; 
# not necessary in this case, but good practice to have
if __name__ == '__main__':
    create_table()
    print("Database and table initialized!")
    # app.run() is a method that starts the Flask development server;
    # debug=True enables debug mode, which provides detailed error messages and automatic reloading;
    # host='127.0.0.1' specifies the host address to bind the server to (localhost);
    # port=5000 specifies the port number to bind the server to (5000 is the default port for Flask development servers)
    app.run(debug=True, host='127.0.0.1', port=5000)  
