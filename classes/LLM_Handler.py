import os
import requests
from dotenv import load_dotenv
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import List, Optional
import configparser
from abc import ABC, abstractmethod
import html


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
        
    def add_reference_files(self, messages, reference_files):
        """
        Adds the reference files contents to the messages fed to the LLM.
        
        Args:
            messages (List[BaseMessage]): List of message objects.
            reference_files (set): A set of valid filepaths for reference files as strings.

        Returns:
            List[dict]: List of messages formatted for the Grok API.
        """
        if reference_files is None or len(reference_files) == 0:
            return messages
        
        # Read reference files
        reference_files_contents = self.read_reference_files(reference_files)
        # Append reference files to messages
        messages.append({"role": "system", "content": 'You are a helpful AI assitant that now has access to the contents of certain reference files that are relevant to the chat and the user prompt. The filenames and contents are provided below for your reference.'})
        messages.append({"role": "system", "content": reference_files_contents })
        return messages

    def convert_messages(self, history: List[dict], n_last_messages=1000, chat_summary: str = None, messages: List[dict] = None) -> List[dict]:
        """
        Convert langchain messages to LLM API compatible messages.

        Args:
            messages (List[BaseMessage]): List of message objects.

        Returns:
            List[dict]: List of messages formatted for the Grok API.
        """
        if messages is None:
            messages = []
        
        if chat_summary is not None:
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
        
    def read_reference_files(self, filepaths):
        """
        Concatenates the contents of all files in the given set of filepaths.

        Args:
            filepaths (set): A set of valid filepaths as strings.

        Returns:
            str: The concatenated contents of all files.
        """
        if filepaths is None or len(filepaths) == 0:
            return ''
        # Initialize an empty string to store the concatenated contents
        concatenated_contents = ""
        reference_files = '\n\n You have access to the following reference files: '        

        # Iterate over each filepath in the set
        cnt = 0
        for filepath in filepaths:
            try:
                # Check if the file exists and is a regular file (not a directory)
                if os.path.isfile(filepath):
                    filename = os.path.basename(filepath)
                    if cnt > 0:
                        reference_files += ', '
                    reference_files += filename
                    # Open the file in read mode and append its contents to the string
                    print(filename)
                    concatenated_contents += filename 
                    cnt += 1
                    concatenated_contents += ': \n ----------------------------------- \n '
                    with open(filepath, 'r', encoding='utf-8') as file:
                        # Read the file contents and escape special characters
                        contents = html.escape(file.read())
                        concatenated_contents += contents 
                        concatenated_contents += ' \n ----------------------------------- \n '
                else:
                    print(f"Warning: {filepath} is not a valid file.")
            except Exception as e:
                print(f"Error reading {filepath}: {e}")

        reference_files += '.\n\n '
        return reference_files + concatenated_contents
    
    @abstractmethod
    def get_llm_name(self):
        pass

    @abstractmethod
    def get_response(self, prompt: str, 
                     history: Optional[ChatMessageHistory] = None, 
                     chat_summary: str = None, 
                     n_last_messages: int = 10, 
                     reference_files: str = None) -> str:
        """
        Get a response from LLM based on the prompt and conversation history.

        Args:
            prompt (str): The user's prompt.
            history (ChatMessageHistory, optional): The conversation history.
            chat_summary (str): Summary of chat history.
            n_last_messages (int): The last n messages to feed to the LLM
            reference_files: A set of related reference files to feed to the LLM.

        Returns:
            str: The assistant's response.
        """
        pass
        