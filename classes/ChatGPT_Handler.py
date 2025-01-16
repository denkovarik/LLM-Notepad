import os
import requests
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import List, Optional
from openai import OpenAI
from .LLM_Handler import LLM_Handler


class ChatGPT_Handler(LLM_Handler):
    """
    A handler class for interacting with Open AI's ChatGPT API.
    """

    def __init__(self, model_name: str = "gpt-3.5-turbo", temperature: float = 0.7):
        """
        Initialize the ChatGPT_Handler.

        Args:
            model_name (str): The name of the ChatGPT model to use.
            temperature (float): The temperature setting for the model's responses.
        """
        super().__init__(model_name, temperature)

        # Access the API key
        self.api_key = self.config["CHATGPT_API"]["OPENAI_API_KEY"]
        self.client = OpenAI( api_key = self.api_key )
        
    def get_llm_name(self):
        return 'ChatGPT'

    def get_response(self, prompt: str, history: Optional[ChatMessageHistory] = None) -> str:
        """
        Get a response from ChatGPT based on the prompt and conversation history.

        Args:
            prompt (str): The user's prompt.
            history (ChatMessageHistory, optional): The conversation history.

        Returns:
            str: The assistant's response.
        """
        # Prepare the messages for the API call
        messages = []
        if history:
            messages = self.convert_messages(history.messages)

        # Add the current user prompt
        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}]
            )
            assistant_message = response.choices[0].message.content
            return assistant_message.strip()
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with ChatGPT API: {e}")
            return "I'm sorry, but I'm unable to assist with that request at the moment."
