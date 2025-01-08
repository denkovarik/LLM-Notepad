import sys
import os
import json
from langchain.schema import HumanMessage, AIMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from Local_LLM_Handler import Local_LLM_Handler 
from Chat import Chat
        

def main():
    """
    Main function to run the Chat in the terminal.
    """
    chat_history_file = None
    
    if len(sys.argv) > 1:
        chat_history_file = sys.argv[1]

    chat = Chat(chat_history_file)

    # Optionally, display the previous conversation
    chat.display_previous_conversation()
    
    # Initialize ChatGPT Handler and load chat history
    local_llm_handler = Local_LLM_Handler()

    print(f"Welcome to {local_llm_handler.get_llm_name()} Terminal!")
    print(f"Model: {local_llm_handler.model_name}")
    print("Type 'exit' to quit the application.\n")
    
    while True:
        try:
            # Get user input
            user_input = chat.get_user_input()
            print("")
            
            if user_input.lower() == "exit":
                print("Goodbye!")
                break
            
            # Display response
            print_model = True
            for chunk in chat.get_ai_response(user_input, local_llm_handler):
                if print_model:
                    print(local_llm_handler.get_llm_name(), end=': ', flush=True)
                    print_model = False
                print(chunk, end='', flush=True)
            print('\n')  # New line after full response is printed
        
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break
        except Exception as e:
            print(f"An error occurred: {e}")
            break

if __name__ == "__main__":
    main()
