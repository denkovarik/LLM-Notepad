import os
import requests
import json
from dotenv import load_dotenv
from langchain.schema import AIMessage, HumanMessage, BaseMessage, SystemMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import List, Optional
import configparser
from yaspin import yaspin
from classes.Local_LLM_Handler import Local_LLM_Handler 
from classes.Grok_Handler import Grok_Handler 
from classes.ChatGPT_Handler import ChatGPT_Handler


class Chat:
    def __init__(self, chat_history_file=None, max_messages_to_feed=10, chat_summarizer_llm_model_name=None):
        """
        Initialize the Chat.
        
        Args:
            chat_history_file (str): Filepath to the previous chat history file to load
            max_messages_to_feed (int): The max number of messages that can be fed to the main LLM
            chat_summarizer_llm_model_name (str): The model used for summarizing chat hisotry.
        """
        self.chat_active = True
        self.chat_history_file = chat_history_file
        if chat_history_file is not None:
            self.ensure_file_path_exists(chat_history_file)        
        self.chat_history = self.load_chat_history(chat_history_file)
        # Create new summary of chat after so many prompts
        self.summarize_chat_countdown = 10000000
        self.chat_summary = None
        self.max_messages_to_feed = max_messages_to_feed  
        self.chat_summarizer_llm_model_name = chat_summarizer_llm_model_name
        self.llm_chat_summarizer = None
        if self.chat_summarizer_llm_model_name is not None:
            self.set_llm_chat_summarizer(self.chat_summarizer_llm_model_name)

    def append_message_to_history_file(self, message, chat_history_file):
        """
        Append a single message to the chat history file.
        
        Args:
            message (BaseMessage): The message to append.
            chat_history_file (str): Filename and path for the chat history file
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
        """
        Prompts that LLM with the user prompt and the chat history. 
        Returns the LLM response as a stream of chunks.
       
        Args:
            user_input (str): The user prompt
            AI (LLM_Handler): The LLM that's being prompt
            
        Yields:
            chunk (str): Chunks of a stream for the AI response
        """
        response = ''    
        spinner_active = True

        with yaspin(text=AI.get_llm_name() + ': ', spinner='dots', side='right') as spinner:
            try:
                for chunk in AI.get_response(prompt=user_input, history=self.chat_history, chat_summary=self.chat_summary):
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

        if self.llm_chat_summarizer is not None:
            self.summarize_chat_countdown -= 2
            if self.summarize_chat_countdown < 1:
                self.summarize_chat_countdown = self.max_messages_to_feed 
                self.summarize_chat_countdown = 1
                self.summarize_chat(self.chat_history, self.max_messages_to_feed * 2)
                
    def get_chat_history_json(self):
        """
        Retrieves chat history as a list of json messages
        
        Returns:
            message_list: Chat history as a list of json messages
        """
        # Convert ChatMessageHistory messages into JSON-friendly format
        message_list = []
        for msg in self.chat_history.messages:
            if isinstance(msg, HumanMessage):
                message_list.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                message_list.append({"role": "assistant", "content": msg.content})
                
        return message_list
            
    def get_user_input(self):
        """
        Prompts user for input
        
        Returns:
            user_input (str): The user prompt/input
        """
        user_input = input("You: ").strip()
        return user_input
            
    def load_chat_history(self, chat_history_file):
        """
        Load chat history from a JSON Lines file.
        
        Args:
            chat_history_file (str): Filepath to the previous chat history file to load
        
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
        
    def summarize_history_enabled(self):
        """
        Indicates if LLM chat summarization is enabled
        
        Returns:
            True: If model to summarize chat history is set
            False: Otherwise
        """
        if self.llm_chat_summarizer is not None:
            return True
        return False
        
    def set_max_messages_to_feed(self, max_messages):
        """
        Setter for field max_messages_to_feed
        
        Args:
            max_messages (int): The value to set for 'max_messages_to_feed'
        """
        self.max_messages_to_feed = max_messages
        if self.max_messages_to_feed < self.summarize_chat_countdown:
            self.summarize_chat_countdown = self.max_messages_to_feed - 1
    
    def set_llm_chat_summarizer(self, chat_summarizer_llm_model_name):
        """
        Initializes LLM for providing chat history summaries and summarizes the 
        current chat history.
        
        Args:
            chat_summarizer_llm_model_name (str): The model used for summarizing chat hisotry.
        """
        self.chat_summarizer_llm_model_name = chat_summarizer_llm_model_name
        if self.chat_summarizer_llm_model_name is None:
            self.llm_chat_summarizer = None
            return
        self.llm_chat_summarizer = Local_LLM_Handler(model_name=chat_summarizer_llm_model_name, temperature=0.2)
        self.summarize_chat_countdown = self.max_messages_to_feed
        self.summarize_chat(self.chat_history, 10000)
        
    def summarize_chat(self, history: ChatMessageHistory, n_last_messages=1000):
        """
        Summarizes the current chat history using an LLM. 
        
        Args:
            chat_history (ChatMessageHistory): The chat history
            n_last_messages (int): The n last messages to parse for the chat summary
        """       
        if not history.messages:
            return
        
        system_prompt = '''\
        ... You are a helpful AI assistant that is best at summarizing chat history. 
        ... The above is part or all of the chat history for you to summarize.
        ...
        ... The above chat was between the user and an AI assistant (i.e. not you).
        ... Below is the current summary of the chat: 
        ... ----------------------
        ... {chat_summary}
        ... ----------------------
        ...
        ... Please use the chat history and the current chat summary to summarize the chat history. Please adhere to the following guidelines when compiling you summary:
        ... 1. Please don't 
        ... 2. Be as detailed as you need to be, and don't worry too much about the length of the summary. 
        ... 3. Please summarize the chat that would give any Large Language Model that proper context to adequately respond to the user's prompt.
        ... 4. Remember that you are not the AI participating in this chat.
        ... 5. Refer to the other AI as 'the AI'.' 
        ...
        ... Please provide a summarry of the above chat. \
        ... '''.format(chat_summary=self.chat_summary)    
        
        response = ''
        for chunk in self.llm_chat_summarizer.get_response(prompt=system_prompt, history=history):
            # Stop the spinner once we start receiving data
            response += chunk  
        self.chat_summary = response
           
    