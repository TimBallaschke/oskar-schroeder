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

def init_db():
    """Initialize the database with the required tables"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create states table with created_at and headline columns
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS states (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                headline TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Database initialization error: {str(e)}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def save_state(state_id, content, headline=None):
    """Save a state to the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Insert state with current timestamp and headline
        cursor.execute("""
            INSERT INTO states (id, content, headline, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, (state_id, content, headline))
        
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
        
        cursor.execute("SELECT content, headline FROM states WHERE id = ?", (state_id,))
        result = cursor.fetchone()
        
        if result:
            # Return the content and headline as a dictionary
            return {
                "content": result[0],
                "headline": result[1]
            }
        return None
    except Exception as e:
        print(f"Database error retrieving state: {str(e)}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()

def cleanup_old_states():
    """Delete states older than 2 weeks"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Delete states older than 2 weeks
        cursor.execute("""
            DELETE FROM states 
            WHERE created_at < datetime('now', '-14 days')
        """)
        
        deleted_count = cursor.rowcount
        conn.commit()
        
        if deleted_count > 0:
            print(f"Cleaned up {deleted_count} old states from the database")
        
        return True
    except Exception as e:
        print(f"Database error cleaning up old states: {str(e)}")
        return False
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
app.config['SESSION_PERMANENT'] = True  # Make sessions permanent so they persist
app.config['SESSION_USE_SIGNER'] = True  # Sign session cookies for security
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

# class HeadlineComponent(BaseModel):
#     UIType: Literal["headline"] = Field(
#         description="Indicates this is a standalone headline component used to structure paragraph content."
#     )
#     headline: str = Field(
#         description=(
#             "A short headline (1–3 words) that introduces a new major topic or section in the paragraph content. "
#             "Use this component when the following paragraphs begin a new thematic section or shift in focus."
#         )
#     )

class ImageComponent(BaseModel):
    UIType: Literal["image"] = Field(description="Indicates this is an image component for displaying an image")
    image_url: str = Field(description="The URL of the image")
    caption: str = Field(description="A caption for the image. Important: Should be maximum 1 sentence long")

class HeadlineComponent(BaseModel):
    UIType: Literal["headline"] = Field(
        description="Indicates this is a headline component used to structure and organize content into sections."
    )
    headline: str = Field(
        description="A short headline (1–2 words) that introduces a new thematic section or shift in focus. It can be used to divide the content into meaningful parts and improve readability."
    )

class ParagraphComponent(BaseModel):
    UIType: Literal["paragraphs"] = Field(
        description=(
            "Indicates this is a *paragraph* component for flowing, narrative text only. "
            "Do **not** use it for lists, tables, or other structured data."
        )
    )
    thought_process: str = Field(
        description="Short sentence representing the AI assistant's thoughts while generating the component. IMPORTANT: ALL thought processes must be written in the SAME LANGUAGE as the user request."
    )
    image: Optional[ImageComponent] = Field(
        description=(
            "IMPORTANT: Always try to include an image with a paragraph.\n"
            "Prioritize selecting the image that is *most closely* related to the paragraph content in terms of theme, mood, material, time period, process, or setting.\n"
            "It does not have to depict the content literally, but the closest match should always be preferred.\n"
            "This includes biographical or contextual text: for instance, use images from the corresponding timeframe, studio, or process when writing about a phase in Oskar Schroeder’s life or practice.\n"
            "Only return null if **no suitable match** can be reasonably determined from all available image sources (e.g., process, studio, reference, sketches)."
        )
    )
    text: List[str] = Field(
        description=(
            "The text content of the paragraph. Each sentence should be a separate paragraph.\n\n"
            "IMPORTANT: Proper names should be wrapped in brackets, including names of individuals, locations, cities, organizations, institutions, "
            "historical and cultural periods, artistic movements, theories, styles, significant events, and well-known works. "
            "IMPORTANT — BRACKETING RULES:\n"
            "• Wrap proper names in square brackets.\n"
            "• This includes:\n"
            "  – Individuals (e.g., [Thomas Rentmeister], [Karen Barad], [Elisabeth Wagner], [Jan Kochermann], [Corinna Schnitt], [Axel Loytved], [Janosch Heydorn],[BKH Gutmann], [Olaf Metzel], [Georg Winter], [Karin Kamolz])\n"
            "  – Cities and locations (e.g., [Flensburg], [North Frisia])\n"
            "  – Institutions and organizations (e.g., [Muthesius University of Fine Arts],[Galerie Ewelyn Drewes, Hamburg],[Kunsthaus Kaufbeuren], [HBK Braunschweig], [Galerie KuCo Flensburg], [Maximiliansforum], [Prima Kunst Container Kiel], [Hannover Re],[Kunstverein Braunschweig], [Galerie 21 Vorwerkstift Hamburg], [Raum Links Rechts, Hamburg], [Duborg Skolen], [Eckener Schule Flensburg])\n"
            "  – Cultural and historical references (e.g., [New Materialism], [Stucco marble], [Beaux‑Arts Nantes Saint‑Nazaire])\n"
            "• DO NOT bracket the artist’s name. Always write: Oskar Schroeder (without brackets).\n\n"
        )
    )


class ListItem(BaseModel):
    prefix: int = Field(
        description=(
            "A prefix for the list item. For example '2010', '2011', '2012' or '01', '02', '03' etc.\n"
            "IMPORTANT: Always use a prefix other than 0.\n"
            "If the content relates to a chronological event (e.g. CV), use the appropriate year as prefix. Otherwise simply number the list items."
        )
    )
    item: str = Field(
        description="The text content of the list item. Should be a bullet point 1-5 words long.\n\n"
                    "IMPORTANT: Proper names should be wrapped in brackets, including names of individuals, locations, organizations, institutions, "
                    "historical and cultural periods, artistic movements, theories, styles, significant events, and well-known works. "
                    "For example: '[Muthesius University of Fine Arts]', '[HBK Braunschweig]', '[Thomas Rentmeister]', '[Elisabeth Wagner]', "
                    "'[Flensburg]', '[North Frisia]', '[Stucco marble]', '[New Materialism]', '[Karen Barad]', '[Kunstverein Braunschweig]', "
                    "'[Galerie KuCo]', '[Raum Links Rechts, Hamburg]', '[Galerie Ewelyn Drewes, Hamburg]', '[Prima Kunst Container]', "
                    "'[Kunsthaus Kaufbeuren]', '[Galerie 21]', '[Vorwerkstift Hamburg]', '[Stadtgalerie Kiel]', '[Duborg Skolen]', "
                    "'[Eckener Schule Flensburg]', '[Hannover Re]', '[Prospekt]', '[Maximiliansforum]', '[Galerie der Künstler]', "
                    "'[Beaux‑Arts Nantes Saint‑Nazaire]', '[Regine Schulz]', '[Mats Hoff]', '[Janosch Heydorn]', '[Karin Kamolz]', "
                    "'[Corinna Schnitt]', '[Jan Kochermann]', '[BKH Gutmann]', '[Axel Loytved]', '[Olaf Metzel]', '[Georg Winter]'.\n\n"
                    "Important: The artist's name 'Oskar Schroeder' should **never** be wrapped in brackets.")

class ListComponent(BaseModel):
    UIType: Literal["list"] = Field(description="Indicates this is a list component for displaying a list of items for example a CV (curriculum vitae)")
    thought_process: str = Field(
        description="Short sentence representing the AI assistant's thoughts while generating the component. IMPORTANT: ALL thought processes must be written in the SAME LANGUAGE as the user request."
    )
    headline: Optional[str] = Field(description="A short headline for the list")
    items: List[ListItem] = Field(description="A list of short text items with a prefix to be displayed")

class TableComponent(BaseModel):
    UIType: Literal["table"] = Field(
        description="Indicates this is a table component for displaying structured data"
                    "This format is suitable for structured overviews such as lists of exhibitions and CVs")
    thought_process: str = Field(
        description="Short sentence representing the AI assistant's thoughts while generating the component. IMPORTANT: ALL thought processes must be written in the SAME LANGUAGE as the user request."
    )
    headers: List[str] = Field(description="Column headers for the table. Headers should be single words when possible")
    rows: List[List[str]] = Field(
        description="Rows of data, where each row is a list of strings\n\n"
                    "IMPORTANT: Proper names should be wrapped in brackets, including names of individuals, locations, cities, organizations, institutions, "
                    "historical and cultural periods, artistic movements, theories, styles, significant events, and well-known works. "
                    "IMPORTANT — BRACKETING RULES:\n"
                    "• Wrap proper names in square brackets.\n"
                    "• This includes:\n"
                    "  – Individuals (e.g., [Thomas Rentmeister], [Karen Barad], [Elisabeth Wagner], [Jan Kochermann], [Corinna Schnitt], [Axel Loytved], [Janosch Heydorn],[BKH Gutmann], [Olaf Metzel], [Georg Winter], [Karin Kamolz])\n"
                    "  – Cities and locations (e.g., [Flensburg], [North Frisia])\n"
                    "  – Institutions and organizations (e.g., [Muthesius University of Fine Arts],[Galerie Ewelyn Drewes, Hamburg],[Kunsthaus Kaufbeuren], [HBK Braunschweig], [Galerie KuCo Flensburg], [Maximiliansforum], [Prima Kunst Container Kiel], [Hannover Re],[Kunstverein Braunschweig], [Galerie 21 Vorwerkstift Hamburg], [Raum Links Rechts, Hamburg], [Duborg Skolen], [Eckener Schule Flensburg])\n"
                    "  – Cultural and historical references (e.g., [New Materialism], [Stucco marble], [Beaux‑Arts Nantes Saint‑Nazaire])\n"
                    "• DO NOT bracket the artist's name. Always write: Oskar Schroeder (without brackets).\n\n")

class ArtworksLayout(str, Enum):
    fullscreen = "fullscreen"
    grid = "grid"

class GridArtworkComponent(BaseModel):
    UIType: Literal["grid_artwork"] = Field(description="Indicates this is a grid artwork component that represents an artwork in grid view")
    images: List[str] = Field(description="A URL for an image. Important: Only return one image.")
    name: str = Field(description="Name of the artwork")

class FullscreenArtworkComponent(BaseModel):
    UIType: Literal["fullscreen_artwork"] = Field(description="Indicates this is a fullscreen artwork component that represents an artwork in detailed view")
    thought_process: str = Field(
        description="Short sentence representing the AI assistant's thoughts while generating the component. IMPORTANT: ALL thought processes must be written in the SAME LANGUAGE as the user request."
    )
    name: str = Field(description="Name of the artwork")
    year: str = Field(description="Year the artwork was created")
    material: str = Field(description="Primary material used in the artwork")
    dimensions: str = Field(description="Physical dimensions of the artwork")
    images: List[str] = Field(description="A list of URLs for all available images of the artwork")
    description: List[str] = Field(
        description=(
            "A detailed artwork description.\n\n"
            "IMPORTANT: Proper names should be wrapped in brackets, including names of individuals, locations, organizations, institutions, "
            "historical and cultural periods, artistic movements, theories, styles, significant events, and well-known works. "
            "For example: '[Muthesius University of Fine Arts]', '[HBK Braunschweig]', '[Thomas Rentmeister]', '[Elisabeth Wagner]', "
            "'[Flensburg]', '[North Frisia]', '[Stucco marble]', '[New Materialism]', '[Karen Barad]', '[Kunstverein Braunschweig]', "
            "'[Galerie KuCo]', '[Raum Links Rechts, Hamburg]', '[Galerie Ewelyn Drewes, Hamburg]', '[Prima Kunst Container]', "
            "'[Kunsthaus Kaufbeuren]', '[Galerie 21]', '[Vorwerkstift Hamburg]', '[Stadtgalerie Kiel]', '[Duborg Skolen]', "
            "'[Eckener Schule Flensburg]', '[Hannover Re]', '[Prospekt]', '[Maximiliansforum]', '[Galerie der Künstler]', "
            "'[Beaux‑Arts Nantes Saint‑Nazaire]', '[Regine Schulz]', '[Mats Hoff]', '[Janosch Heydorn]', '[Karin Kamolz]', "
            "'[Corinna Schnitt]', '[Jan Kochermann]', '[BKH Gutmann]', '[Axel Loytved]', '[Olaf Metzel]', '[Georg Winter]'.\n\n"
            "Important: The artist's name 'Oskar Schroeder' should **never** be wrapped in brackets."
        )
    )

class ArtworksList(BaseModel):
    UIType: Literal["projects_list"] = Field(description="Indicates this is an artworks list component for displaying a list of projects")
    thought_process: str = Field(
        description="Short sentence representing the AI assistant's thoughts while generating the component. IMPORTANT: ALL thought processes must be written in the SAME LANGUAGE as the user request."
    )
    layout: ArtworksLayout = Field(
        description=(
            "Display layout for artworks. "
            "Use 'fullscreen' when only a few artworks are shown and more detailed textual components are expected for each."
            "Use 'grid' layout when many artworks are shown, particularly in response to sorting, filtering, or overview requests "
            "(for example, 'sort artworks by year', 'show all artworks in wood'). "
        )
    )
    headline: Optional[str] = Field(
        description=(
            "A short, categorizing headline that helps contextualize the group of artworks shown. "
            "Only include this if the user request implies a thematic, material-based, or temporal categorization. "
            "Keep it concise and informative (e.g. 'Wood', '2023')."
        )
    )
    projects: Union[List[GridArtworkComponent], List[FullscreenArtworkComponent]] = Field(
        description="A list of artwork components. Use GridArtworkComponent for 'grid' layout and FullscreenArtworkComponent for 'fullscreen' layout."
    )

# FIRST CHATBOT

# Root level must be a simple object
class Response_1(BaseModel):
    type: Optional[Literal["response"]]  # Literal makes sure only a certain value is allowed for the type field / Fixed type to ensure root level is a simple object (not a descriminated union)
    thought_process: List[str] = Field(
        description="List of multiple short sentences representing the AI assistant's thoughts while generating the response. Each sentence should be concise and actionable. IMPORTANT: ALL thought processes must be written in the SAME LANGUAGE as the user request."
    )
    headline: HeadlineComponent = Field(
        description=(
            "A short, precise title for the response. "
            "Do not include the artist's name. "
            "IMPORTANT: Must reflect the user's request, not just the topic. "
            "If the user asks for an 'extensive description', the headline should say 'Extensive Description'. "
            "If the user asks for a 'biography', the headline should say 'Biography'. "
            "Mirror the intent and phrasing of the user's request where possible. "
            "Limit to a maximum of 2 words. "
            "IMPORTANT: Needs to match the language of the user-facing content."
        )
    )
    language: str = Field(
        description=(
            "The language of the response. "
            "For example: 'English' or 'German' or 'French' or 'Spanish'"
        )
    )
    components: List[Union[ParagraphComponent, ListComponent, TableComponent, ArtworksList]] = Field(
        description="List of UI components that make up the response"
    )


# SECOND CHATBOT

class Response_2(BaseModel):
    prompt_proposal_1: str = Field(
        description=(
            "An actionable suggestion guiding the user toward unexplored or complementary information about Oskar Schroeder. "
            "This should encourage the discovery of new content, helping the user explore areas of Oskar's biography, work, or exhibitions that have not yet been shown."
            "IMPORTANT: Match the language of the response to the language of the user-facing content."
        )
    )
    prompt_proposal_2: str = Field(
        description=(
            "Another concise recommendation that invites the user to continue exploring unfamiliar aspects of Oskar Schroeder's artistic life. "
            "Suggestions should introduce new data from the available dataset."
            "IMPORTANT: Match the language of the response to the language of the user-facing content."
        )
    )
    prompt_proposal_3: str = Field(
        description=(
            "A third prompt that focuses on helping the user uncover content not yet displayed. "
            "It should be logically connected to the user's journey but must lead to a distinct topic or dataset."
            "IMPORTANT: Match the language of the response to the language of the user-facing content."
            )
    )
    prompt_proposal_4: str = Field(
        description=(
            "A final proposal (max. 40 characters) that is engaging, easy to understand, and leads to **new** information about Oskar Schroeder."
            "IMPORTANT: Match the language of the response to the language of the user-facing content."
        )
    )



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
    session['current_user_message'] = request.json['message']
    
    session.modified = True
    
    return jsonify({"status": "ok"})  # Respond to confirm the message was received

@app.route('/stream')
def stream():
    
    user_message = session.get('current_user_message')

    # Create fresh messages array with just system prompt and user message
    messages = [
        prompts["SYSTEM_PROMPT_1"],
        {"role": "user", "content": user_message}
    ]

    def generate():
        with client.beta.chat.completions.stream(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.5,
            max_tokens=6000,
            response_format=Response_1,
            stream_options={"include_usage": False}  # Skip token counting for faster response
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
            response_format=Response_2
        )

        second_response = response.choices[0].message.parsed

        print("\n=== Second Chatbot Raw Response ===")
        print(second_response)

        print("\n=== Second Chatbot Parsed Response ===")
        print(json.dumps(second_response.model_dump(), indent=2))

        # Generate a unique state ID
        state_id = generate_unique_id()

        # Append chatbot 2's response to session
        messages_2.append({
            "role": "assistant",
            "content": json.dumps(second_response.model_dump())
        })
        session.modified = True

        # Send chatbot 2's response to the frontend with the state_id
        yield f"data: {json.dumps({'type': 'second_complete', 'content': second_response.model_dump(), 'stateId': state_id})}\n\n"

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
            stream_options={"include_usage": False}  # Skip token counting for faster response
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
    language = request.json.get('language', 'English')  # Get language from frontend, default to English

    session['messages_4'] = user_message
    session['websearch_language'] = language  # Store language for websearch
    
    print(f"Received websearch request with language: {language}")

    session.modified = True             

    return jsonify({"status": "ok"})  # Respond to confirm the message was received

@app.route('/stream4')
def stream4():
    print("stream4")
    messages_4 = session.get('messages_4', [])
    current_language = session.get('websearch_language', 'English')  # Get language from websearch request
    print(f"Using language for websearch: {current_language}")
    
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
                            "text": f"You are a helpful assistant. The user will provide you with short terms, names, "
                                    f"or references — including people, places, events, organizations, or artistic concepts.\n\n"
                                    f"For each input, provide a clear, short and concise description (1–3 sentences) to help "
                                    f"the user understand what the term means or refers to.\n\n"
                                    f"Always use your web search tool to include up-to-date and relevant information, "
                                    f"especially for people, institutions, or events that may have recent developments.\n\n"
                                    f"Your explanations should be factual, accessible, and easy to understand for a "
                                    f"general audience. Avoid technical jargon unless it's essential.\n\n"
                                    f"IMPORTANT: Do not include citations, links, or source references in your response. "
                                    f"Do not use footnotes or annotations. Just provide the information directly.\n\n"
                                    f"IMPORTANT: The description should be short and concise. 3 sentences max.\n\n"
                                    f"IMPORTANT: Always respond in {current_language}."
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
            return jsonify(state_data)
        else:
            return jsonify({"error": "State not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/save_state', methods=['POST'])
def save_state_route():
    try:
        data = request.get_json()
        state_id = data.get('state_id')
        content = data.get('content')
        headline = data.get('headline')  # Get headline from request
        
        if not state_id or not content:
            return jsonify({"error": "Missing state_id or content"}), 400
            
        success = save_state(state_id, content, headline)
        if success:
            # Clean up old states after saving new one
            cleanup_old_states()
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Failed to save state"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500







# Run the Flask application if this file is run directly
# this condition checks if the script is being run directly (not imported as a module in another script);
# if __name__ is '__main__', it means the script is being run directly; 
# not necessary in this case, but good practice to have
init_db()

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
