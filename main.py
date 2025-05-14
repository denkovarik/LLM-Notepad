import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import ollama
import os, json
from fastapi import File, UploadFile
from pydantic import BaseModel
from typing import List, Dict
import subprocess
import tempfile
import time

from classes.Local_LLM_Handler import Local_LLM_Handler
from classes.Grok_Handler import Grok_Handler
from classes.ChatGPT_Handler import ChatGPT_Handler
from classes.Chat import Chat

CHATS_DIR = "./chats"
ONLINE_MODELS = ["Grok", "ChatGPT"]
ONLINE_MODELS_LIGHT_RAG = ["ChatGPT"]
BASE_DIR_PATH = "C:\\"
BASE_DIR_PATH = '/home'

class AppState:
    def __init__(self):
        self.active_model = "llama2:latest"
        self.llm_handler = None
        self.chat = Chat(None)
        self.chat_summarizer_llm_model_name = None
        self.light_rag_enabled = False
        ollama_output = ollama.list()
        self.ollama_models = [m.model for m in ollama_output.models] if ollama_output and ollama_output.models else []
        self.lightRAG_llm_model_name = None
        self.lightRAG_embed_model_name = None

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.state = AppState()

@app.post("/api/open_file_browser")
def open_file_browser(request: Request):
    st = request.app.state.state
    try:
        filePath = select_file(BASE_DIR_PATH)
        new_dir_path = os.path.dirname(filePath)
        st.chat.add_file_path(filePath)
        
        return {"message": "File browser opened successfully!", "new_dir_path": new_dir_path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def select_file(initialDir="C:\\"):
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as temp:
        temp_filename = temp.name
        # Convert WSL path to Windows path
        win_temp_filename = subprocess.run(['wslpath', '-w', temp_filename], capture_output=True, text=True).stdout.strip()
        
        # Prepare PowerShell command to open file dialog and write the path to the temp file
        ps_command = f'''
            Add-Type -AssemblyName System.Windows.Forms
            $file = New-Object System.Windows.Forms.OpenFileDialog
            $file.InitialDirectory = "{initialDir}"
            if($file.ShowDialog() -eq "OK") {{
                $file.FileName | Out-File -Encoding ASCII -FilePath '{win_temp_filename}'
            }}
        '''
        
        # Run PowerShell command to open file dialog
        subprocess.run(['powershell.exe', '-Command', ps_command])
        
        # Check if a file was selected
        if os.path.exists(temp_filename):
            with open(temp_filename, 'r') as f:
                file_path = f.read().strip()
            os.remove(temp_filename)
            
            # Convert the Windows path to WSL path
            wsl_file_path = subprocess.run(["wslpath", "-u", file_path], capture_output=True, text=True).stdout.strip()
            
            # Extract just the filename
            filename = os.path.basename(wsl_file_path)
            
            # Print the full path and filename
            print(f"Selected File Path: {wsl_file_path}")
            print(f"Selected File Name: {filename}")
            
            return wsl_file_path
        else:
            print("No file selected")
            return None

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
    models += ONLINE_MODELS
    return {"models": models}
    
@app.get("/api/light_rag_models")
def get_light_rag_models():
    models = list_ollama_models()
    models += ONLINE_MODELS_LIGHT_RAG
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
        "maxMessagesToFeed": st.chat.max_messages_to_feed,
        "lightRAGEnabled": st.chat.lightRAG_enabled(),
        "lightRAGLLMModel": st.chat.lightRAG_llm_model_name,
        "lightRAGEmbedModel": st.chat.lightRAG_embed_model_name,
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
    
class LightRAGToggle(BaseModel):
    lightRAGEnabled: bool

@app.post("/api/set_light_rag")
def set_light_rag(selection: LightRAGToggle, request: Request):
    st = request.app.state.state
    st.chat.light_rag_enabled = selection.lightRAGEnabled
    message = "Que?"
    if selection.lightRAGEnabled:
        message = {"detail": "Light RAG has been Enabled"}
    else:
        message = {"detail": "Light RAG has been Disabled"}
    print(message)
    return message
    
@app.post("/api/set_lightRAG_llm_model") 
def set_lightRAG_llm_model(selection: ModelSelection, request: Request):
    model_name = selection.model.strip()
    
    installed = list_ollama_models()
    if model_name not in installed and model_name not in ONLINE_MODELS:
        raise HTTPException(status_code=400, detail="Model not found.")
    
    st = request.app.state.state
    st.lightRAG_llm_model_name = model_name
    
    if st.chat:
        st.chat.set_lightRAG_llm_model(st.lightRAG_llm_model_name)
        
    message = {"detail": f"Light RAG LLM model set to {model_name}"}
    print(message)
    
    return message
    
@app.post("/api/set_lightRAG_embed_model") 
def set_lightRAG_embed_model(selection: ModelSelection, request: Request):
    model_name = selection.model.strip()
    
    installed = list_ollama_models()
    if model_name not in installed and model_name not in ONLINE_MODELS:
        raise HTTPException(status_code=400, detail="Model not found.")
    
    st = request.app.state.state
    st.lightRAG_embed_model_name = model_name
    
    if st.chat:
        st.chat.set_lightRAG_embed_model(st.lightRAG_embed_model_name)
    
    message = {"detail": f"Light RAG Embed model set to {model_name}"}
    print(message)
    
    return {"detail": f"Light RAG Embed model set to {model_name}"}
    
@app.post("/api/initialize_light_rag") 
def init_light_rag(request: Request):
    print("Initializing Light RAG")
    
    st = request.app.state.state
    
    # Logic 
    time.sleep(30)
    
    message = {"detail": f"Light RAG has been initialized with LLM model set to {st.chat.lightRAG_llm_model_name} and the Embed model set to {st.chat.lightRAG_embed_model_name}"}
    print(message)
        
    return message

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
