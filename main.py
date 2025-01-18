# main.py
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from classes.Local_LLM_Handler import Local_LLM_Handler
from classes.Chat import Chat

app = FastAPI()

# Allow local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/api/chat/stream")
def stream_chat(request: Request, message: str):
    """
    Returns a Server-Sent Events stream of tokens for the LLM's response.
    Accepts `message` as a query parameter or from the URL.
    """

    # Because SSE is a GET endpoint, the user’s prompt can be passed as a query param, e.g. /api/chat/stream?message=Hello
    # If you want to do POST for SSE, you'd need a different client approach. GET is simpler for SSE demos.
    
    def event_generator(user_message: str):
        chat = Chat(None)  # No chat history file for simplicity
        local_llm_handler = Local_LLM_Handler()
        # get_ai_response(...) yields chunks
        for chunk in chat.get_ai_response(user_message, local_llm_handler):
            yield f"data: {chunk}\n\n"
        # After all chunks, yield a sentinel
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(message), media_type="text/event-stream")


# Typical startup
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
