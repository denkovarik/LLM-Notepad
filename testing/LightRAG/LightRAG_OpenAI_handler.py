import os, sys
import asyncio
import time
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import gpt_4o_mini_complete, openai_embed
from classes.LightRAG_Handler import LightRAG_Interface, LightRAG_OpenAI, LightRAG_Local


def main():
    WORKING_DIR = "./LightRAG_OpenAI"
    
    text_file = "./chats/llm_sample_chat.json"
    
    if len(sys.argv) > 1:
        text_file = sys.argv[1]
    
    # Initialize LightRAGOpenAI instance
    rag_openai = LightRAG_OpenAI(
        working_dir=WORKING_DIR,
    )

    # Initialize RAG instance
    asyncio.run(rag_openai.initialize())

    # Insert example text
    with open(text_file, "r", encoding="utf-8") as f:
        asyncio.run(rag_openai.insert(f.read()))
    
    query = "What is the main point of the story?"

    # Start timing
    start_time = time.time()
    
    print("\nHybrid Search:")
    result = asyncio.run(rag_openai.query(query, QueryParam(mode="hybrid")))
    print(result)
    
    # End timing
    end_time = time.time()

    # Calculate and print the time taken
    print(f"Operation took {end_time - start_time} seconds")

if __name__ == "__main__":
    main()