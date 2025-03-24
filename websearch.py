from openai import OpenAI

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


stream = client.responses.create(
    model="gpt-4o",
    tools=[
        {
            "type": "web_search_preview",
        }
    ],
    input="what are the best chinese restaurants in Hamburg?",
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
        print(event.response.output[0].content[0].annotations)
