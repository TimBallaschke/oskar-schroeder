from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from pydantic import BaseModel, Field
from typing import List

# Load environment variables from .env file (including API key)
load_dotenv()

client = OpenAI()

# Define Pydantic models
class Project(BaseModel):
    title: str
    year: int

# class ProjectsResponse(BaseModel):
#     projects: List[Project]


response = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a data provider for Oskar Schroeder's art projects. You must only return structured data about the project with the title'Capture' from 2021. Format all responses as a Project object with fields 'title' and 'year'. Do not provide any narrative or descriptive text - only return valid structured data."},
        {"role": "user", "content": "Could you provide me with the title and year of Oskar Schroeder's project?"},
    ],
    temperature=0.1,      # Controls randomness (1 = more creative)
    max_tokens=200,    # Maximum length of response
    response_format=Project,
)

# print(response.choices[0].message.parsed)

print(response.choices[0].message.parsed)