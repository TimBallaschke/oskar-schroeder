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

class ProjectsResponse(BaseModel):
    projects: List[Project]


response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful, knowledgeable, and precise assistant. You aim to provide accurate and relevant information while being direct and clear in your responses. Please keep your answers concise and focused on the user's question."},
        {"role": "user", "content": "How many people live in Berlin?"},
    ],
    temperature=0.1,      # Controls randomness (1 = more creative)
    max_tokens=200,    # Maximum length of response
    # response_format=ProjectsResponse,
)

print(response.choices[0].message.content)
    