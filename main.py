from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from pydantic import BaseModel, Field

# Load environment variables from .env file (including API key)
load_dotenv()

client = OpenAI()

# Define Pydantic models
class Project(BaseModel):
    title: str = Field(description="Title of the project.")
    year: int = Field(description="Year of the project.")


response = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a data provider for Oskar Schroeder's art projects. You must only return structured data about the project. The title of the project is 'Capture' and it was created in the year 2021."},
        {"role": "user", "content": "Could you provide me with the title and year of Oskar Schroeder's project?"},
    ],
    temperature=0.1,      # Controls randomness (1 = more creative)
    max_tokens=200,    # Maximum length of response
    response_format=ProjectsList,
)

# print(response.choices[0].message.parsed)

print(response.choices[0].message.parsed.model_dump())