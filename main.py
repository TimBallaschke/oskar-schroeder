from openai import OpenAI
from dotenv import load_dotenv
import os
import json
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



project_data = {
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

response = client.beta.chat.completions.parse( # parse converts content into pydantic model
    model="gpt-4o-mini",
    messages=[
        {
            "role": "system",
            "content": (
                "You are a data provider for Oskar Schroeder's art projects. "
                "You must only return structured data about the project. "
                f"Here is the data about the project: {str(project_data)}. "
                "There are multiple boolean fields that indicate if the information is asked for or not. "
                "If the information is not asked for, set the boolean to False. "
                "If asked about Oskar's Projects, consider this as only being asked about the name of the project. "
                "For description handling: "
                "- If asked for a description or additional information, provide a brief summary (max 100 characters) of key points. "
                "- If specifically asked for a detailed or extensive description, provide create a full description with all available details of key points. "
                "- If asked about specific aspects (like exhibition locations or materials), provide only that particular information. "
                "When the description contains list-like information, format it using HTML lists (e.g., <ul><li>item1</li><li>item2</li></ul>)."
            )
        },
        {"role": "user", "content": "Please provide a description of the project."},
    ],
    temperature=0.5,   # Controls randomness (1 = more creative)
    max_tokens=200,    # Maximum length of response
    response_format=Project,
)

print(response.choices[0].message.parsed.model_dump())
