import asyncio
import time
from lightrag import LightRAG, QueryParam
from lightrag.llm.ollama import ollama_model_complete, ollama_embed
import os, io, sys, inspect
currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(currentdir)
grandparentdir = os.path.dirname(parentdir)
sys.path.insert(0, grandparentdir)
from classes.LightRAG_Handler import LightRAG_Interface, LightRAG_Local
sys.path.insert(0, currentdir)


def main():
    WORKING_DIR = "./LightRAG_Ollama"
    
    text_file = "./chats/llm_sample_chat.json"
    
    if len(sys.argv) > 1:
        text_file = sys.argv[1]
    
    # Initialize LightRAGOpenAI instance
    rag_local = LightRAG_Local(
        working_dir=WORKING_DIR,
    )

    # Initialize RAG instance
    asyncio.run(rag_local.initialize())

    # Insert example text
    with open(text_file, "r", encoding="utf-8") as f:
        asyncio.run(rag_local.insert(f.read()))
    
    query = "What is the main point of the story?"

    # Start timing
    start_time = time.time()
    
    print("\nHybrid Search:")
    result = asyncio.run(rag_local.query(query, QueryParam(mode="hybrid")))
    print(result)
    
    # End timing
    end_time = time.time()

    # Calculate and print the time taken
    print(f"Operation took {end_time - start_time} seconds")

if __name__ == "__main__":
    main()