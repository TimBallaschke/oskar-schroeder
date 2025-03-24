from openai import OpenAI
from dotenv import load_dotenv
import os


load_dotenv()
client = OpenAI()


stream = client.responses.create(
    model="gpt-4o-mini",
    tools=[
        {
            "type": "web_search_preview",
        }
    ],
    input=[
        {
            "role": "system",
            "content": [
                {
                    "type": "input_text",
                    "text": "You are a helpful assistant. The user will provide you with short terms, names, "
                            "or references — including people, places, events, organizations, or artistic concepts.\n\n"
                            "For each input, provide a clear and concise description (1–3 sentences) to help "
                            "the user understand what the term means or refers to.\n\n"
                            "Always use your web search tool to include up-to-date and relevant information, "
                            "especially for people, institutions, or events that may have recent developments.\n\n"
                            "Your explanations should be factual, accessible, and easy to understand for a "
                            "general audience. Avoid technical jargon unless it's essential.\n\n"
                            "IMPORTANT: Do not include citations, links, or source references in your response. "
                            "Do not use footnotes or annotations. Just provide the information directly."
                },
                {
                    "role": "user",
                    "content": [
                        {
                        "type": "input_text",
                        "text": "How big is berlin"
                        }
                    ]
                }
            ]
        }
    ],
    stream=True,
)

for event in stream:
    if event.type == "response.output_text.delta":
        print("----------------------------------------------------------------------------------")
        print(event.delta)  # ← This is the generated text chunk
    elif event.type == "response.completed":
        print("----------------------------------------------------------------------------------")
        print("----------------------------------------------------------------------------------")
        print("----------------------------------------------------------------------------------")
        # print(event.response.output[0].content[0].annotations)


