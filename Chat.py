import os
import requests
import json
from dotenv import load_dotenv
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import List, Optional
import configparser
from yaspin import yaspin


class Chat:
    def __init__(self, chat_history_file=None):
        """
        Initialize the Chat.

        Args:
            chat_history_file (str): Filepath to the previous chat history file to load
        """
        self.chat_active = True
        self.chat_history_file = chat_history_file
        if chat_history_file is not None:
            self.ensure_file_path_exists(chat_history_file)        
        self.chat_history = self.load_chat_history(chat_history_file) 

    def append_message_to_history_file(self, message, chat_history_file):
        """
        Append a single message to the chat history file.
        Args:
            message (BaseMessage): The message to append.
        """
        if chat_history_file is None:
            return
        
        msg_dict = {
            "role": "user" if isinstance(message, HumanMessage) else "assistant",
            "content": message.content
        }
        with open(chat_history_file, "a") as file:
            file.write(json.dumps(msg_dict) + "\n")
            
    def display_previous_conversation(self):
        """
        Display the previously loaded conversataion.
        """
        if self.chat_history_file is None:
            return
            
        if self.chat_history.messages:
            print("Previous conversation:")
            for msg in self.chat_history.messages:
                role = "You" if isinstance(msg, HumanMessage) else "ChatGPT"
                print(f"{role}: {msg.content}")
            print("\n--- Resuming conversation ---\n")

    def ensure_file_path_exists(self, file_path, valid_extensions=None):
        """
        Ensure that the directory for the file exists, the file path is valid,
        and create the file if it doesn't exist.
        
        Args:
            file_path (str): The file path to check and create if necessary.
            valid_extensions (list, optional): List of valid file extensions (e.g., ['.json']).
            
        Raises:
            ValueError: If the file path is invalid or has an unsupported extension.
        """
        # Validate the file extension
        if valid_extensions:
            _, ext = os.path.splitext(file_path)
            if ext not in valid_extensions:
                raise ValueError(
                    f"Invalid file extension: {ext}. Expected one of {valid_extensions}."
                )
        
        # Get the directory of the file
        directory = os.path.dirname(file_path)
        
        # Ensure the directory exists
        if not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            print(f"Directory created: {directory}")
        
        # Ensure the file exists
        if not os.path.exists(file_path):
            with open(file_path, "w") as file:
                file.write("")  # Create an empty file
            print(f"File created: {file_path}")
        else:
            print(f"File already exists: {file_path}")
            
    def get_ai_response(self, user_input, AI):
        response = ''    
        spinner_active = True

        with yaspin(text=AI.get_llm_name() + ': ', spinner='dots', side='right') as spinner:
            try:
                for chunk in AI.get_response(prompt=user_input, history=self.chat_history):
                    # Stop the spinner once we start receiving data
                    if spinner_active:
                        spinner.stop()
                        spinner_active = False
                    response += chunk
                    yield chunk    
            except Exception as e:
                spinner.stop()  # Stop spinner on error
                raise e
        
        response = response.strip()
        
        # Add user message to history and file
        user_message = HumanMessage(content=user_input)
        self.chat_history.add_message(user_message)
        self.append_message_to_history_file(user_message, self.chat_history_file)
        # Add LLM's response to history and file
        assistant_message = AIMessage(content=response)
        self.chat_history.add_message(assistant_message)
        self.append_message_to_history_file(assistant_message, self.chat_history_file)
            
    def get_user_input(self):
        user_input = input("You: ").strip()
        return user_input
            
    def load_chat_history(self, chat_history_file):
        """
        Load chat history from a JSON Lines file.
        Returns:
            ChatMessageHistory: The loaded chat history, or a new history if the file doesn't exist.
        """
        if chat_history_file is None:
            return ChatMessageHistory()
        
        history = ChatMessageHistory()
        if os.path.exists(chat_history_file):
            with open(chat_history_file, "r") as file:
                for line in file:
                    try:
                        msg = json.loads(line.strip())
                        if msg["role"] == "user":
                            history.add_message(HumanMessage(content=msg["content"]))
                        elif msg["role"] == "assistant":
                            history.add_message(AIMessage(content=msg["content"]))
                    except json.JSONDecodeError:
                        print("Error decoding a line in chat history. Skipping.")
        return history
        