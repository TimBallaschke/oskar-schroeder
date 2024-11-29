from flask import Flask, render_template, request, jsonify, session
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from typing import List, TypeVar, Generic
from pydantic import BaseModel, Field, field_validator

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
# Initialize OpenAI client
client = OpenAI()


# Define Pydantic models for structured responses

T = TypeVar('T')

class ActiveField(BaseModel, Generic[T]):
    value: T = Field(description="The actual value of the field")
    active: bool = Field(description="Whether this field should be displayed or hidden")

class Project(BaseModel):
    name: str = Field(description="Title or name of the project.")
    year: ActiveField[int] = Field(description="Year of the project with active status.")
    material: ActiveField[str] = Field(description="Material used for the project with active status.")
    dimensions: ActiveField[str] = Field(description="Dimensions of the project with active status.")
    description: ActiveField[str] = Field(description="Description text of the project with active status.")

class ProjectList(BaseModel):
    projects: List[Project] = Field(description="List of projects")
    is_valid_request: bool = Field(description="Whether the user request matches the system prompt")
    prompt_proposal_1: str = Field(description="First suggested prompt to help user refine their request")
    prompt_proposal_2: str = Field(description="Second suggested prompt to help user refine their request")

# Data for the projects
project_data_1 = {
    "name": "Capture",
    "year": 2020,
    "material": "Wood",
    "dimensions": "100x100x100cm",
    "description": (
        "A wooden sculpture of a bird in flight. "
        "The bird is a raven. "
        "Took 1 year to complete. "
        "Was made in a studio in Berlin. "
        "The studio was in an old factory building. "
        "The artist won several prices for the artwork. "
        "The artwork was exhibited in several galleries in Germany. "
        "The artwork was exhibited in the galleries: 'Galerie im Kesselhaus', 'Künstlerhaus Bethanien', 'Haus am Waldsee', 'Galerie an der Spree', 'Brücke 1' in Berlin."
    ),
}

project_data_2 = {
    "name": "Exposure",
    "year": 2022,
    "material": "Metal",
    "dimensions": "200x450x600cm",
    "description": (
        "A metal sculpture of a human figure. "
    ),
}

project_data_3 = {
    "name": "Echo",
    "year": 2023,
    "material": "Ceramic",
    "dimensions": "5x8x10cm",
    "description": (
        "A ceramic sculpture of a fish. "
    ),
}

# system prompt
# capitals are a syntax convention to mark that this is a constant variable and should not be changed
SYSTEM_PROMPT = {
    "role": "system",
    "content": (
        "You are a data provider for Oskar Schroeder's art projects. "
        "You must return structured data about projects based on the following rules: "
        f"Here is the data about all available projects: "
        f"Project 1: {str(project_data_1)}. "
        f"Project 2: {str(project_data_2)}. "
        f"Project 3: {str(project_data_3)}. "
        "By default, set all fields' active status to false. "
        "The name field is always included and doesn't have an active status. "
        "Field activation rules: "
        "- Only set active=true for fields that are specifically asked about in the query "
        "- If user asks for 'more information', 'tell me everything', or similar comprehensive requests, set all fields to active=true "
        "- Once a field is set to active=true, it will remain active until explicitly asked to hide/remove that information "
        "Project inclusion rules: "
        "- For filtering queries (e.g. 'show wooden projects', 'projects after 2022'), only include matching projects "
        "- For non-filtering queries about specific projects, return both: "
        "  * The projects specifically mentioned in the query "
        "  * Any projects that were visible in the previous response "
        "- When filtering, only return projects that exactly match the specified criteria "
        "For description handling: "
        "- Keep description.active=false by default "
        "- If specifically asked about description, set description.active=true and provide a brief summary (max 100 characters) "
        "- If asked for detailed/full/more extensive description, set description.active=true and provide extensive description "
        "- If user asks for more information while description is already visible, replace existing description with a more detailed version "
        "- If asked about specific aspects (like exhibition locations), set description.active=true and include only that specific information "
        "- Description will remain visible until explicitly asked to hide/remove the description "
        "- IMPORTANT: Always rephrase descriptions in your own words based on the provided information, never copy verbatim "
        "IMPORTANT: Set is_valid_request=false if the user asks for information not contained in the project data. Otherwise set is_valid_request=true. "
        "For prompt proposals: "
        "- Always provide two different prompt suggestions that could help refine or expand the user's query "
        "- If is_valid_request=false, suggest prompts that guide the user towards available information "
        "- If is_valid_request=true, suggest prompts that could reveal more interesting details about the projects "
        "- Make suggestions contextual to the current query and visible information "
        "- Examples of prompt proposals: "
        "  * If user asks about materials: 'Tell me more about the dimensions of wooden artworks' or 'What year were the metal sculptures made?' "
        "  * If description is visible: 'Where was this artwork exhibited?' or 'Tell me more about the creation process' "
        "  * If invalid request about price: 'What materials were used in this project?' or 'When was this artwork created?' "
        "Examples: "
        "- Query: 'Show all projects' -> Return all projects with all fields' active=false, is_valid_request=true "
        "- Query: 'What year was Capture made?' -> Return Capture with only year.active=true, is_valid_request=true "
        "- Query: 'Tell me everything about Echo' -> Return Echo with all fields' active=true, is_valid_request=true "
        "- Query: 'What are the dimensions of metal sculptures?' -> Return metal projects with only dimensions.active=true, is_valid_request=true "
        "- Query: 'Hide the year for Capture' -> Return Capture with year.active=false, is_valid_request=true "
        "- Query: 'Remove the description' -> Return relevant projects with description.active=false, is_valid_request=true "
        "- Query: 'Tell me more about this project' -> Return the project with description.active=true and provide a more detailed description, is_valid_request=true "
        "- Query: 'Can you elaborate further?' -> If description is visible, replace it with a more comprehensive version, is_valid_request=true "
        "- Query: 'What is the price of Capture?' -> Return Capture with is_valid_request=false as price information is not available "
        "- Query: 'Tell me about the first project' -> Return only Capture, is_valid_request=true "
        "Examples of project retention vs filtering: "
        "- Sequence 1 (Project Retention): "
        "  1. 'Show me Capture' -> Returns Capture "
        "  2. 'Show me Echo' -> Returns both Capture and Echo "
        "  3. 'What material is Echo made of?' -> Returns both Capture and Echo, with Echo's material.active=true "
        "- Sequence 2 (Filtering): "
        "  1. 'Show me all projects' -> Returns all projects "
        "  2. 'Show me projects made after 2022' -> Returns only Echo (year 2023) "
        "  3. 'Show me wooden projects' -> Returns only Capture (material: Wood) "
    )
}

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
    session['messages'] = [SYSTEM_PROMPT]
    
    # Render the main chat interface (render_template is a function in Flask that locates and loads an HTML File)
    return render_template('index.html')

# Define route for api endpoint, accepting POST requests;
# POST requests are used to send data to the server, such as form submissions, file uploads, or API requests;
@app.route('/projects', methods=['POST'])
# a post request triggers the function below
def projects():
    user_message = request.json['message']  
    
    if 'messages' in session:
        messages = session['messages']
    else:
        messages = [SYSTEM_PROMPT]
        
    messages.append({"role": "user", "content": user_message})
    session.modified = True

    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.5,
        max_tokens=2048,
        response_format=ProjectList,
    )

    # Create a dictionary to store projects with their names as keys
    projects_dict = {}

    # Loop through all projects and add them to the dictionary using project name as key
    for project in response.choices[0].message.parsed.projects:
        project_dict = project.model_dump()
        # Remove the name field since it's used as the key
        del project_dict['name']
        projects_dict[project.name] = project_dict

    # Get the is_valid_request value and prompt proposals
    is_valid_request = response.choices[0].message.parsed.is_valid_request
    prompt_proposal_1 = response.choices[0].message.parsed.prompt_proposal_1
    prompt_proposal_2 = response.choices[0].message.parsed.prompt_proposal_2

    # Create response dictionary
    response_data = {
        'projects': projects_dict,
        'is_valid_request': is_valid_request,
        'prompt_proposal_1': prompt_proposal_1,
        'prompt_proposal_2': prompt_proposal_2
    }
    
    # Print response data for debugging
    print("API Response:", json.dumps(response_data, indent=2))

    # Return projects dictionary, is_valid_request, and prompt proposals
    return jsonify(response_data)




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

