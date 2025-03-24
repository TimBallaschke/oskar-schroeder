from openai import OpenAI
from dotenv import load_dotenv
import os


load_dotenv()
client = OpenAI()



# --------------------------------------------------------------
# Basic web search
# --------------------------------------------------------------

# stream = client.responses.create(
#     model="gpt-4o",
#     tools=[
#         {
#             "type": "web_search_preview",
#         }
#     ],
#     input="how big is hamburg?",
# )

# for chunk in stream:
#     if chunk.choices[0].delta.content is not None:
#         print(chunk.choices[0].delta.content, end="")


# stream = client.responses.create(
#     model="gpt-4o",
#     tools=[
#         {
#             "type": "web_search_preview",
#         }
#     ],
#     input="what are the best chinese restaurants in Hamburg?",
#     stream=True,
# )

# for event in stream:
#     if event.type == "response.output_text.delta":
#         print("----------------------------------------------------------------------------------")
#         print(event.delta)  # ← This is the generated text chunk
#     elif event.type == "response.completed":
#         print("----------------------------------------------------------------------------------")
#         print("----------------------------------------------------------------------------------")
#         print("----------------------------------------------------------------------------------")
#         print(event.response.output[0].content[0].annotations)



# response = client.responses.create(
#     model="gpt-4o",
#     tools=[
#         {
#             "type": "web_search_preview",
#         }
#     ],
#     input=[
#         {
#             "role": "system",
#             "content": [
#                 {
#                 "type": "input_text",
#                 "text": "You are a helpful assistant. The user will provide you with short terms, names, or references — including people, places, events, organizations, or artistic concepts.\n\nFor each input, provide a clear and concise description (1–3 sentences) to help the user understand what the term means or refers to.\n\nAlwaysuse your web search tool to include up-to-date and relevant information, especially for people, institutions, or events that may have recent developments.\n\nYour explanations should be factual, accessible, and easy to understand for a general audience. Avoid technical jargon unless it's essential."
#                 }
#             ]
#         },
#         {
#             "role": "user",
#             "content": [
#                 {
#                 "type": "input_text",
#                 "text": "Galerie Hamburg Feinkunst Krüger"
#                 }
#             ]
#         }
#     ],
# )

# print(response.output_text)

stream = client.responses.create(
    model="gpt-4o",
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
                "text": "You are a helpful assistant. The user will provide you with short terms, names, or references — including people, places, events, organizations, or artistic concepts.\n\nFor each input, provide a clear and concise description (1–3 sentences) to help the user understand what the term means or refers to.\n\nAlwaysuse your web search tool to include up-to-date and relevant information, especially for people, institutions, or events that may have recent developments.\n\nYour explanations should be factual, accessible, and easy to understand for a general audience. Avoid technical jargon unless it's essential."
                }
            ]
        },
        {
            "role": "user",
            "content": [
                {
                "type": "input_text",
                "text": "raum linksrechts, Hamburg"
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


