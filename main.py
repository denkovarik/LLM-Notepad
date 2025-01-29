import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import ollama
import os, json

from classes.Local_LLM_Handler import Local_LLM_Handler
from classes.Grok_Handler import Grok_Handler
from classes.ChatGPT_Handler import ChatGPT_Handler
from classes.Chat import Chat
from pydantic import BaseModel

CHATS_DIR = "./chats"
ONLINE_MODELS = ["Grok", "ChatGPT"]

class AppState:
    def __init__(self):
        self.active_model = "llama2:latest"
        self.llm_handler = None
        self.chat = Chat(None)
        self.chat_summarizer_llm_model_name = None

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.state = AppState()

class CreateChatRequest(BaseModel):
    name: str

@app.post("/api/chats")
def create_chat(request: CreateChatRequest):
    """
    Creates a new chat file named <user-chosen-name>.json
    Returns { "chat_id": "<filename>.json" }
    """
    if not os.path.exists(CHATS_DIR):
        os.makedirs(CHATS_DIR)

    # Clean up user name if you want to remove spaces or special characters
    chat_name = request.name.strip().replace(" ", "_").replace("/", "_")
    chat_filename = f"{chat_name}.json"  # directly use that name as filename
    file_path = os.path.join(CHATS_DIR, chat_filename)
    
    cnt = 1 
    while os.path.exists(file_path):
        chat_filename = f"{chat_name} ({cnt}).json"  # directly use that name as filename
        file_path = os.path.join(CHATS_DIR, chat_filename)
        cnt += 1

    # Create empty or minimal content
    with open(file_path, 'w') as f:
        # Possibly write an empty JSON lines or an empty JSON array
        f.write("")  # or f.write("[]")

    return {"chat_id": chat_filename}

@app.get("/api/chats")
def list_chats():
    """
    Returns the list of saved chat files from ./chats
    """
    if not os.path.exists(CHATS_DIR):
        os.makedirs(CHATS_DIR)

    files = os.listdir(CHATS_DIR)
    chat_files = [f for f in files if f.endswith(".json")]
    return {"chats": chat_files}

@app.get("/api/chats/{chat_id}")
def load_chat(chat_id: str, request: Request):
    """
    Loads the selected chat from the UI.
    """  
    st = request.app.state.state
    file_path = os.path.join(CHATS_DIR, chat_id) if chat_id != "None" else None
    st.chat = Chat(file_path)

    # Convert chat to JSON
    message_list = st.chat.get_chat_history_json()
    return {"messages": message_list}

def list_ollama_models():
    """
    Retrieve installed models from Ollama. 
    We'll call `ollama.list()`, which returns an object with `.models`.
    Each model might have `.model` as an attribute.
    """
    try:
        output = ollama.list()
        return [m.model for m in output.models] if output and output.models else []
    except:
        return []

@app.get("/api/models")
def get_models():
    models = list_ollama_models()
    models += ["Grok", "ChatGPT"]
    return {"models": models}

class ModelSelection(BaseModel):
    model: str

@app.post("/api/set_model")
def set_model(selection: ModelSelection, request: Request):
    model_name = selection.model.strip()
    installed = list_ollama_models()
    if model_name not in installed and model_name not in ONLINE_MODELS:
        raise HTTPException(status_code=400, detail="Model not found.")
    load_model(model_name, request)
    return {"detail": f"Active model set to {model_name}"}
 
class SummarizationToggle(BaseModel):
    summarizeHistory: bool
 
@app.get("/api/get_settings")
def get_settings(request: Request):
    st = request.app.state.state
    return {
        "summarizeHistory": st.chat.summarize_history_enabled(),
        "summaryModel": st.chat.chat_summarizer_llm_model_name,
        "maxMessagesToFeed": st.chat.max_messages_to_feed
    }
    
class MaxMessages(BaseModel):
    maxMessages: int
    
@app.post("/api/set_max_messages")
def set_max_messages(selection: MaxMessages, request: Request):
    st = request.app.state.state
    if st.chat:
        st.chat.set_max_messages_to_feed(selection.maxMessages)
    return {"detail": f"Max messages set to {selection.maxMessages}"}
 
@app.post("/api/set_summarization")
def set_summarization(selection: SummarizationToggle, request: Request):
    st = request.app.state.state
    if not selection.summarizeHistory:
        st.chat.set_llm_chat_summarizer(None)
    return {"detail": "Summarization setting updated"}
 
@app.post("/api/disable_summarization")
def disable_summarization(request: Request):
    st = request.app.state.state
    if st.chat:
        st.chat.set_llm_chat_summarizer(None)
    return {"detail": "Chat history summarization disabled"}
 
@app.post("/api/set_summarization_model") 
def set_summarization_model(selection: ModelSelection, request: Request):
    model_name = selection.model.strip()
    installed = list_ollama_models()
    if model_name not in installed and model_name not in ONLINE_MODELS:
        raise HTTPException(status_code=400, detail="Model not found.")
    
    st = request.app.state.state
    st.chat_summarizer_llm_model_name = model_name
    
    # Here we are assuming that `set_llm_chat_summarizer` is a method in your `Chat` class
    if st.chat:
        st.chat.set_llm_chat_summarizer(st.chat_summarizer_llm_model_name)
    
    return {"detail": f"Summarization model set to {model_name}"}

def load_model(model_name: str, request: Request):
    """
    If Ollama requires an explicit load step, do it here. Otherwise, we just track model_name globally.
    For demonstration, we only store it in `ACTIVE_MODEL`.
    """
    st = request.app.state.state
    st.active_model = model_name
    if model_name == "Grok":
        st.llm_handler = Grok_Handler()
    elif model_name == "ChatGPT":
        st.llm_handler = ChatGPT_Handler()
    else:
        st.llm_handler = Local_LLM_Handler(model_name=st.active_model)
    print(f"Active model set to: {model_name}")

@app.get("/api/chat/stream")
def stream_chat(message: str, request: Request):
    """
    Returns a Server-Sent Events stream of tokens for the LLM's response.
    Accepts `message` as a query parameter or from the URL.
    """
    st = request.app.state.state

    def event_generator(user_message: str):
        for chunk in st.chat.get_ai_response(user_message, st.llm_handler):
            chunk = chunk.replace('\n', '\\n')
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(message), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
