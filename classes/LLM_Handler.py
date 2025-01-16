import os
import requests
from dotenv import load_dotenv
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import List, Optional
import configparser
from abc import ABC, abstractmethod


class LLM_Handler:
    """
    A handler class for interacting with Open AI's ChatGPT API.
    """

    def __init__(self, model_name: str = "gpt-3.5-turbo", temperature: float = 0.7):
        """
        Initialize the LLM_Handler.

        Args:
            model_name (str): The name of the Grok model to use.
            temperature (float): The temperature setting for the model's responses.
        """
        # Load configuration file
        self.config = configparser.ConfigParser()
        self.config.read("config/config.ini")
        self.model_name = model_name
        self.temperature = temperature

    def convert_messages(self, messages: List[BaseMessage]) -> List[dict]:
        """
        Convert langchain messages to Grok API compatible messages.

        Args:
            messages (List[BaseMessage]): List of message objects.

        Returns:
            List[dict]: List of messages formatted for the Grok API.
        """
        converted_messages = []
        for message in messages:
            if isinstance(message, HumanMessage):
                converted_messages.append({"role": "user", "content": message.content})
            elif isinstance(message, AIMessage):
                converted_messages.append({"role": "assistant", "content": message.content})
            else:
                # For any other message types, default to 'user' role
                converted_messages.append({"role": "user", "content": message.content})
        return converted_messages
    
    @abstractmethod
    def get_llm_name(self):
        pass

    @abstractmethod
    def get_response(self, prompt: str, history: Optional[ChatMessageHistory] = None) -> str:
        """
        Get a response from LLM based on the prompt and conversation history.

        Args:
            prompt (str): The user's prompt.
            history (ChatMessageHistory, optional): The conversation history.

        Returns:
            str: The assistant's response.
        """
        pass