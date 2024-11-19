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



project_data = {
    "name": "Capture",
    "year": 2020,
    "material": "Wood",
    "dimensions": "100x100x100cm",
}

response = client.beta.chat.completions.parse( # parse converts content into pydantic model
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a data provider for Oskar Schroeder's art projects. You must only return structured data about the project. Here is the data about the project: " + str(project_data) + ". There is are multiple boolean fields that indicate if the information is asked for or not. If the information is not asked for you should set the boolean to False. If you get asked about Oskars Projects you can consider this as only being asked about the name of the project. If you get asked for additional information you set the booleans to True."},
        {"role": "user", "content": "Could you provide me with info about Oskar Schroeder's project?."},
    ],
    temperature=0.1,   # Controls randomness (1 = more creative)
    max_tokens=200,    # Maximum length of response
    response_format=Project,
)

print(response.choices[0].message.parsed.model_dump())
