import os, sys
import asyncio
import time
from lightrag import LightRAG, QueryParam
from lightrag.llm.ollama import ollama_model_complete, ollama_embed
from classes.LightRAG_Handler import LightRAG_Interface, LightRAG_Local


def main():
    WORKING_DIR = "./LightRAG_Ollama"
    
    # Initialize LightRAGOpenAI instance
    rag_local = LightRAG_Local(
        working_dir=WORKING_DIR,
    )

    # Initialize RAG instance
    asyncio.run(rag_local.initialize())

    # Insert example text
    with open("./chats/llm_sample_chat.json", "r", encoding="utf-8") as f:
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