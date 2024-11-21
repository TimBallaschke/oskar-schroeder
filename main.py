from flask import Flask, render_template, request, jsonify, session
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from typing import List
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
class Project(BaseModel):
    name: str = Field(description="Title or name of the project.")
    year: int = Field(description="Year of the project.")
    year_active: bool = Field(description="Whether the year is asked for.")
    material: str = Field(description="Material used for the project.")
    material_active: bool = Field(description="Whether the material is asked for.")
    dimensions: str = Field(description="Dimensions of the project.")
    dimensions_active: bool = Field(description="Whether the dimensions are asked for.")
    description: str = Field(description="Description text of the project.")
    description_active: bool = Field(description="Whether the description is asked for.")

class ProjectList(BaseModel):
    projects: List[Project] = Field(description="List of projects")

# Data for the projects
project_data_1 = {
    "name": "Capture",
    "year": 2020,
    "material": "Wood",
    "dimensions": "100x100x100cm",
    "description": (
        "A wooden sculpture of a bird in flight. "
        "The bird as a raven. "
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
        "You must return structured data ONLY about the projects that are relevant to the user's query. "
        f"Here is the data about all available projects: "
        f"Project 1: {str(project_data_1)}. "
        f"Project 2: {str(project_data_2)}. "
        f"Project 3: {str(project_data_3)}. "
        "There are multiple boolean fields that indicate if the information is asked for or not. "
        "If the information is not asked for, set the boolean to False. "
        "If asked for information about Oskar's Projects in general, return all projects with only names and set all booleans to false. "
        "For description handling: "
        "- If asked for a description or additional information, provide a brief summary (max 100 characters) of key points. "
        "- If specifically asked for a detailed or extensive description, provide create a full description with all available details of key points. "
        "- If asked about specific aspects (like exhibition locations or materials), provide only that particular information. "
        "IMPORTANT: Only include projects in your response that are relevant to the user's query. "
        "For example, if asked about the latest project, only return data for the most recent project. "
        "If asked about wooden sculptures, only return projects that use wood as material."
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

    # Create list to store all projects
    projects_list = []

    # Loop through all projects and add them to the list
    for project in response.choices[0].message.parsed.projects:
        project_dict = project.model_dump()
        projects_list.append(project_dict)

    # Return all projects as JSON response
    print(projects_list)
    return jsonify({'projects': projects_list})



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

