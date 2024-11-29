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
    value: T = Field(description="The actual value of the field.")
    active: bool = Field(
        description=(
            "Boolean flag indicating whether this field should be displayed (True) or hidden (False). "
            "Set to True only if the user specifically requests this information or uses related keywords."
        )
    )

class Project(BaseModel):
    name: str = Field(
        description=(
            "Title or name of the project. "
            "Always included and does not have an active status."
        )
    )
    year: ActiveField[int] = Field(
        description=(
            "Year the project was created. "
            "Set year.active=True only if the user specifically requests information related to the year "
            "(e.g., 'year', 'date', 'time')."
        )
    )
    material: ActiveField[str] = Field(
        description=(
            "Material used for the project. "
            "Set material.active=True only if the user specifically requests information related to the material "
            "(e.g., 'material')."
        )
    )
    dimensions: ActiveField[str] = Field(
        description=(
            "Dimensions of the project. "
            "Set dimensions.active=True only if the user specifically requests information related to dimensions "
            "(e.g., 'dimensions', 'size')."
        )
    )
    description: ActiveField[str] = Field(
        description=(
            "Description text of the project. "
            "Set description.active=True only if the user specifically requests a description or more information "
            "(e.g., 'description', 'tell me more'). "
            "Provide a brief summary (max 100 characters) unless a detailed description is specifically requested."
        )
    )
    multiple_images: bool = Field(
        description=(
            "Boolean flag indicating whether multiple images should be displayed for this project (True) or not (False). "
            "Set to True only if the user specifically requests to see multiple or all images of the project "
            "(e.g., 'show more images', 'all images')."
        )
    )

class ProjectList(BaseModel):
    projects: List[Project] = Field(
        description=(
            "List of projects to be displayed, filtered according to the user's request. "
            "Include only the projects that exactly match the user's criteria."
        )
    )
    is_valid_request: bool = Field(
        description=(
            "Boolean flag indicating whether the user's request matches the available project data and adheres to the system rules. "
            "Set to False if the user asks for unavailable information (e.g., price) or violates inclusion rules."
        )
    )
    prompt_proposal_1: str = Field(
        description=(
            "First suggested prompt to help the user refine or expand their query. "
            "Should be relevant to the current query and the information displayed."
        )
    )
    prompt_proposal_2: str = Field(
        description=(
            "Second suggested prompt to help the user refine or expand their query. "
            "Should offer a different angle or additional information related to the user's interests."
        )
    )

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
        "You must return structured data about projects based on the following rules:\n"
        "\n"
        "Available Projects Data:\n"
        f"Project 1: {project_data_1}\n"
        f"Project 2: {project_data_2}\n" 
        f"Project 3: {project_data_3}\n"
        "\n"
        "General Rules:\n"
        "\n"
        "Default Settings:\n"
        "- Fields' active status: By default, set all fields' active status to false.\n"
        "- Name field: Always include the name field; it does not have an active status.\n"
        "- Multiple images: Set multiple_images=false by default for all projects.\n"
        "\n"
        "Project Inclusion Rules:\n"
        "- General queries:\n"
        "  - For general requests or keywords like 'projects', 'all projects', 'list projects', return all projects.\n"
        "\n"
        "- Specific criteria queries:\n"
        "  - For queries with specific criteria, return only the projects that exactly match those criteria.\n"
        "    - Latest project: Return only the most recent project based on the year.\n"
        "    - First project: Return only the earliest project based on the year.\n"
        "    - Material-specific projects: Return only projects made of the specified material.\n"
        "    - Biggest/smallest project: Return only the project with the largest or smallest dimensions as specified.\n"
        "  - Do not include projects that do not meet the specified criteria.\n"
        "  - If a project was included in a previous response and the user asks for another project, only include the projects explicitly requested unless the user refers to 'previous projects' or 'all shown projects'.\n"
        "\n"
        "Field Activation Rules:\n"
        "- Activating fields with keywords and short phrases:\n"
        "  - When the user provides keywords or phrases, apply the activation only to the projects that were returned in the last response (currently displayed projects).\n"
        "  - If only one project is currently displayed, the activation applies only to that project.\n"
        "  - Examples:\n"
        "    - If the user provides keywords like 'year', 'date', or 'time', set year.active=true for the currently displayed projects.\n"
        "    - If the user provides keywords like 'material', set material.active=true for the currently displayed projects.\n"
        "    - If the user provides keywords like 'dimensions' or 'size', set dimensions.active=true for the currently displayed projects.\n"
        "    - If the user provides keywords like 'description' along with a project name, set description.active=true for that specific project only.\n"
        "      - Example: 'Description of Echo' sets description.active=true for 'Echo' only.\n"
        "\n"
        "- Activating fields generally:\n"
        "  - Set a field's active status to true if the user specifically requests information related to that field.\n"
        "  - Setting a field's active status to true for one project does not imply it should be set to true for all projects unless the user requests that information for all projects.\n"
        "\n"
        "- Hiding fields:\n"
        "  - If the user asks to hide or remove a field, set that field's active status to false for the specified project(s).\n"
        "\n"
        "- Show less information:\n"
        "  - If the user asks to 'show less information' or similar, set the active status of all fields to false again for the currently displayed projects.\n"
        "\n"
        "- Field persistence:\n"
        "  - Once a field's active status is set to true for a project, it remains active until the user asks to hide that field for that project or resets all fields.\n"
        "\n"
        "Multiple Images Handling:\n"
        "- Default setting:\n"
        "  - multiple_images=false for all projects.\n"
        "\n"
        "- Activating multiple images:\n"
        "  - Set multiple_images=true only if the user specifically requests to see multiple or all images of a project.\n"
        "  - If the user asks to hide additional images, set multiple_images=false.\n"
        "\n"
        "Description Handling:\n"
        "- Default setting:\n"
        "  - description.active=false by default.\n"
        "\n"
        "- Activating description:\n"
        "  - If the user asks for a description or more information, set description.active=true and provide a brief summary (maximum 100 characters).\n"
        "  - If the user provides the keyword 'description' along with a project name, activate the description for that specific project only.\n"
        "\n"
        "- Detailed descriptions:\n"
        "  - If the user requests a detailed or extensive description, provide a comprehensive description.\n"
        "\n"
        "- Updating descriptions:\n"
        "  - If the description is already visible and the user asks for more details, replace the existing description with a more detailed version.\n"
        "\n"
        "- Specific aspects:\n"
        "  - If asked about specific details (e.g., exhibition locations), include only that information in the description.\n"
        "\n"
        "- Rephrasing:\n"
        "  - Always rephrase descriptions in your own words based on the provided information. Do not copy text verbatim.\n"
        "\n"
        "- Persistence:\n"
        "  - The description remains visible until the user asks to hide or remove it.\n"
        "\n"
        "Important Notes:\n"
        "- Validity of requests:\n"
        "  - Set is_valid_request=false if the user asks for information not contained in the project data (e.g., price).\n"
        "  - Otherwise, set is_valid_request=true.\n"
        "\n"
        "- Prompt proposals:\n"
        "  - Always provide two prompt suggestions (prompt_proposal_1 and prompt_proposal_2) to help the user refine or expand their query.\n"
        "  - If is_valid_request=false, suggest prompts that guide the user toward available information.\n"
        "  - Make suggestions relevant to the current query and visible information.\n"
        "\n"
        "Examples:\n"
        "\n"
        "Keyword and Short Phrase Handling Examples:\n"
        "- User: 'projects'\n"
        "  - Response: Return all projects with all fields' active=false and multiple_images=false, is_valid_request=true.\n"
        "\n"
        "- User: 'Echo'\n"
        "  - Response: Return 'Echo' only, with all fields' active=false, is_valid_request=true.\n"
        "\n"
        "- User: 'material'\n"
        "  - Response: For 'Echo', set material.active=true, is_valid_request=true.\n"
        "    - Note: Since 'Echo' is the only project displayed, 'material' applies only to 'Echo'.\n"
        "\n"
        "- User: 'Show me Capture and Exposure'\n"
        "  - Response: Return 'Capture' and 'Exposure', all fields' active=false, is_valid_request=true.\n"
        "\n"
        "- User: 'year'\n"
        "  - Response: For 'Capture' and 'Exposure', set year.active=true, is_valid_request=true.\n"
        "    - Note: 'year' applies only to the currently displayed projects.\n"
        "\n"
        "- User: 'Hide year of Capture'\n"
        "  - Response: For 'Capture', set year.active=false. 'Exposure' remains unchanged, is_valid_request=true.\n"
        "\n"
        "- User: 'Show me the latest project'\n"
        "  - Response: Return only 'Echo', all fields' active=false, is_valid_request=true.\n"
        "\n"
        "- User: 'dimensions'\n"
        "  - Response: For 'Echo', set dimensions.active=true, is_valid_request=true.\n"
        "    - Note: Since 'Echo' is the only project displayed, 'dimensions' applies only to 'Echo'.\n"
        "\n"
        "- User: 'Hide dimensions'\n"
        "  - Response: For 'Echo', set dimensions.active=false, is_valid_request=true.\n"
        "\n"
        "- User: 'material'\n"
        "  - Response: For 'Echo', set material.active=true, is_valid_request=true.\n"
        "\n"
        "- User: 'Show less information'\n"
        "  - Response: For 'Echo', set all fields' active status to false (except for the name field), is_valid_request=true.\n"
        "\n"
        "Additional Examples:\n"
        "- User: 'Show me projects made of wood'\n"
        "  - Response: Return only 'Capture' (Material: Wood), all fields' active=false, is_valid_request=true.\n"
        "\n"
        "- User: 'year'\n"
        "  - Response: For 'Capture', set year.active=true, is_valid_request=true.\n"
        "\n"
        "- User: 'material'\n"
        "  - Response: For 'Capture', set material.active=true, is_valid_request=true.\n"
        "\n"
        "- User: 'Hide year'\n"
        "  - Response: For 'Capture', set year.active=false, is_valid_request=true.\n"
        "\n"
        "Notes:\n"
        "- When a keyword or phrase is the user's request, it applies only to the projects that were returned in the last response (currently displayed projects).\n"
        "- If only one project is currently displayed, the activation applies only to that project.\n"
        "- Setting a field's active status to true for one project does not affect other projects unless specified.\n"
        "- Fields remain active for a project until the user asks to hide them or resets all fields.\n"
        "- 'Show less information' resets all fields' active status to false for the displayed projects.\n"
        "\n"
        "Invalid Request Example:\n"
        "- User: 'Price'\n"
        "  - Response: Set is_valid_request=false, do not return any projects.\n"
        "  - Prompt Proposals:\n"
        "    - 'Would you like to know the materials used in the projects?'\n"
        "    - 'Are you interested in the years when the projects were created?'\n"
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

