import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama
from classes.Local_LLM_Handler import Local_LLM_Handler
from classes.Grok_Handler import Grok_Handler
from classes.ChatGPT_Handler import ChatGPT_Handler 
from classes.Chat import Chat

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ONLINE_MODELS = ['Grok', 'ChatGPT']

def load_model(model_name: str):
    """
    If Ollama requires an explicit load step, do it here. Otherwise, we just track model_name globally.
    For demonstration, we only store it in `ACTIVE_MODEL`.
    """
    global ACTIVE_MODEL
    global LLM_HANDLER
    ACTIVE_MODEL = model_name
    if ACTIVE_MODEL == 'Grok':
        LLM_HANDLER = Grok_Handler()
    elif ACTIVE_MODEL == 'ChatGPT':
        LLM_HANDLER = ChatGPT_Handler()
    else:
        LLM_HANDLER = Local_LLM_Handler(model_name=ACTIVE_MODEL)
    print(f"Active model set to: {model_name}")

def list_ollama_models():
    """
    Retrieve installed models from Ollama. 
    We'll call `ollama.list()`, which returns an object with `.models`.
    Each model might have `.model` as an attribute.
    """
    try:
        output = ollama.list()  # e.g., <OllamaListResult models=[...]>
        if not output or not output.models:
            return []
        # e.g. output.models = [OllamaModel(model='llama2.7b'), OllamaModel(model='codellama')]
        return [m.model for m in output.models]
    except Exception as e:
        print("Error listing models:", e)
        return []

# Return the list of available models
@app.get("/api/models")
def get_models():
    models = list_ollama_models()
    models.append('Grok')
    models.append('ChatGPT')
    return {"models": models}

# Body schema for choosing model
class ModelSelection(BaseModel):
    model: str

# Endpoint to set the active model
@app.post("/api/set_model")
def set_model(selection: ModelSelection):
    model_name = selection.model.strip()
    # Validate it is in the installed list
    installed = list_ollama_models()
    if model_name not in installed and model_name not in ONLINE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{model_name}' not found among installed: {installed}"
        )
    load_model(model_name)
    return {"detail": f"Active model set to {model_name}"}

@app.get("/api/chat/stream")
def stream_chat(request: Request, message: str):
    """
    Returns a Server-Sent Events stream of tokens for the LLM's response.
    Accepts `message` as a query parameter or from the URL.
    """

    # Because SSE is a GET endpoint, the user’s prompt can be passed as a query param, e.g. /api/chat/stream?message=Hello
    # If you want to do POST for SSE, you'd need a different client approach. GET is simpler for SSE demos.
    
    def event_generator(user_message: str):
        for chunk in CHAT.get_ai_response(user_message, LLM_HANDLER):
            yield f"data: {chunk}\n\n"
        # After all chunks, yield a sentinel
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(message), media_type="text/event-stream")

if __name__ == "__main__":
    ACTIVE_MODEL = "llama2:latest"  # default choice
    CHAT = Chat(None)  # No chat history file for simplicity
    LLM_HANDLER = None
    uvicorn.run(app, host="0.0.0.0", port=8080)
