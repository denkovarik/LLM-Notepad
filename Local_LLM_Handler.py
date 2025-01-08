import ollama
from yaspin import yaspin
from langchain.schema import AIMessage, HumanMessage, BaseMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from typing import List, Optional
from LLM_Handler import LLM_Handler

class Local_LLM_Handler(LLM_Handler):
    """
    A handler class for interacting with a local LLM (like llama3.3) via Ollama with streaming and a yaspin spinner.
    """

    def __init__(self, model_name: str = "llama3.3", temperature: float = 0.7):
        """
        Initialize the Local_LLM_Handler.

        Args:
            model_name (str): The name of the local LLM model to use.
            temperature (float): The temperature setting for the model's responses.
        """
        self.model_name = model_name
        self.temperature = temperature

    def get_response(self, prompt: str, history: Optional[ChatMessageHistory] = None) -> str:
        """
        Get a response from the local LLM based on the prompt and conversation history with streaming and a spinner.

        Args:
            prompt (str): The user's prompt.
            history (ChatMessageHistory, optional): The conversation history.

        Returns:
            str: The assistant's response.
        """
        messages = []
        if history:
            for message in history.messages:
                if isinstance(message, HumanMessage):
                    messages.append({"role": "user", "content": message.content})
                elif isinstance(message, AIMessage):
                    messages.append({"role": "assistant", "content": message.content})

        messages.append({"role": "user", "content": prompt})

        try:
            response = ollama.chat(model=self.model_name, 
                                  messages=messages, 
                                  options={"temperature": self.temperature}, 
                                  stream=True)
            for chunk in response:
                yield chunk['message']['content']
        except Exception as e:
            print(f"Error communicating with local LLM: {e}")
            return "I'm sorry, but I'm unable to assist with that request at the moment."

    def convert_messages(self, messages: List[BaseMessage]) -> List[dict]:
        """
        Convert LangChain messages to a format suitable for Ollama.

        Args:
            messages (List[BaseMessage]): List of messages from LangChain.

        Returns:
            List[dict]: Converted messages for Ollama.
        """
        return [
            {"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content} 
            for m in messages
        ]
        
    def get_llm_name(self):
        return 'llama3.3'