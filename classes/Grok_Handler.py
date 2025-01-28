import os
import requests
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import List, Optional
import configparser
from .LLM_Handler import LLM_Handler


class Grok_Handler(LLM_Handler):
    """
    A handler class for interacting with XAI's Grok API.
    """

    def __init__(self, model_name: str = "grok-beta", temperature: float = 0.7):
        """
        Initialize the Grok_Handler.

        Args:
            model_name (str): The name of the Grok model to use.
            temperature (float): The temperature setting for the model's responses.
        """
        super().__init__(model_name, temperature)

        # Access the API key
        self.api_key = self.config["GROK_API"]["XAI_API_KEY"]
        self.base_url = self.config["GROK_API"]["GROK_API_URL"]
        
    def get_llm_name(self):
        return 'Grok'

    def get_response(self, prompt: str, history: Optional[ChatMessageHistory] = None, n_last_messages: int = 1000) -> str:
        """
        Get a response from Grok based on the prompt and conversation history.

        Args:
            prompt (str): The user's prompt.
            history (ChatMessageHistory, optional): The conversation history.

        Returns:
            str: The assistant's response.
        """
        # Prepare the messages for the API call
        messages = []
        if history:
            messages = self.convert_messages(history.messages, n_last_messages)

        # Add the current user prompt
        messages.append({"role": "user", "content": prompt})

        # Make the API call
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": self.temperature,
        }

        try:
            response = requests.post(self.base_url, json=payload, headers=headers)
            response.raise_for_status()  # Raise an error for HTTP codes 4xx/5xx
            assistant_message = response.json()["choices"][0]["message"]["content"]
            return assistant_message.strip()
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with Grok API: {e}")
            return "I'm sorry, but I'm unable to assist with that request at the moment."
