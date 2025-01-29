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

    def convert_messages(self, history: List[dict], n_last_messages=1000, chat_summary: str = None) -> List[dict]:
        """
        Convert langchain messages to LLM API compatible messages.

        Args:
            messages (List[BaseMessage]): List of message objects.

        Returns:
            List[dict]: List of messages formatted for the Grok API.
        """
        messages = []
        
        if chat_summary is not None:
            print('que')
            messages.append({"role": "system", "content": 'The following is a summary of the current chat:'})
            messages.append({"role": "system", "content": chat_summary})
        
        if history:
            messages.append({"role": "system", "content": 'The following is part or all of the current Chat History.'})
            # Get only the last n messages from history
            last_n_messages = history[-n_last_messages:]
            messages = messages + [
                {"role": "user" if isinstance(message, HumanMessage) else "assistant", "content": message.content}
                for message in last_n_messages
            ]
            
        if history and chat_summary is not None:
            messages.append({"role": "system", "content": 'Please use the provided chat summary and the chat history to respond to the following user prompt.'})
            
        return messages
    
    @abstractmethod
    def get_llm_name(self):
        pass

    @abstractmethod
    def get_response(self, prompt: str, history: Optional[ChatMessageHistory] = None, n_last_messages: int = 10) -> str:
        """
        Get a response from LLM based on the prompt and conversation history.

        Args:
            prompt (str): The user's prompt.
            history (ChatMessageHistory, optional): The conversation history.
            n_last_messages (int): The last n messages to feed to the LLM
            chat_summary: The current summary of the chat.

        Returns:
            str: The assistant's response.
        """
        pass
        