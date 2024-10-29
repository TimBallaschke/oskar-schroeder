from openai import OpenAI
from dotenv import load_dotenv
import os

# Formatting for printing the response
def display_response(text):
    # Clear screen first
    os.system('cls' if os.name == 'nt' else 'clear')
    # Print with some formatting
    print("\n" + "="*50)
    print(text)
    print("="*50 + "\n")

# Load environment variables from .env file
load_dotenv()

# Initialize the OpenAI client
client = OpenAI()

response = client.chat.completions.create(
  model="gpt-4o-mini",
  messages=[
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": "You are a concise assistant. Keep responses brief and to the point."
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "How are you?"
        }
      ]
    }
  ],
  temperature=1,
  max_tokens=2048,
  top_p=1,
  frequency_penalty=0,
  presence_penalty=0,
  response_format={
    "type": "text"
  }
)

display_response(response.choices[0].message.content.strip())
