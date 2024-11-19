from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from typing import List
from pydantic import BaseModel, Field, validator

# Load environment variables from .env file (including API key)
load_dotenv()

client = OpenAI()

# Define Pydantic models
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

response = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {
            "role": "system",
            "content": (
                "You are a data provider for Oskar Schroeder's art projects. "
                "You must return structured data about all projects. "
                f"Here is the data about the projects: "
                f"Project 1: {str(project_data_1)}. "
                f"Project 2: {str(project_data_2)}. "
                f"Project 3: {str(project_data_3)}. "
                "There are multiple boolean fields that indicate if the information is asked for or not. "
                "You must return data for all projects, with appropriate boolean flags set. "
                "If the information is not asked for, set the boolean to False. "
                "If asked for informations aboutOskar's Projects, consider this as only being asked about the name of the project and set all booleans to false. "
                "For description handling: "
                "- If asked for a description or additional information, provide a brief summary (max 100 characters) of key points. "
                "- If specifically asked for a detailed or extensive description, provide create a full description with all available details of key points. "
                "- If asked about specific aspects (like exhibition locations or materials), provide only that particular information. "
            )
        },
        {"role": "user", "content": "Please provide information about Oskar Schroeder's first project."},
    ],
    temperature=0.5,
    max_tokens=200,
    response_format=ProjectList,
)

# Print each project's data
for project in response.choices[0].message.parsed.projects:
    print(f"\nProject: {project.name}")
    print(project.model_dump())
