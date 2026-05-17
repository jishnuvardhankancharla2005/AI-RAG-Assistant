from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import os
import shutil

from rag_core import process_and_store_file, retrieve_context, generate_response
from database import log_query, monitor_accuracy, detect_hallucinations, register_user, verify_user, get_user_actions

app = FastAPI(title="Generative AI RAG API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    username: str = "guest"
    chat_history: list = []

class UserAuth(BaseModel):
    username: str
    password: str

class QueryResponse(BaseModel):
    answer: str
    sources: list
    processing_time: float
    flagged_hallucination: bool

@app.post("/upload")
async def upload_document(files: list[UploadFile] = File(...), username: str = Form(default="guest")):
    """Endpoint to upload documents and add them to the Vector DB."""
    try:
        # Create temp dir if it doesn't exist
        os.makedirs("temp", exist_ok=True)
        total_chunks = 0
        
        for file in files:
            file_path = os.path.join("temp", file.filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            # Process and store in FAISS
            chunks_added = process_and_store_file(file_path)
            total_chunks += chunks_added
            
            # Cleanup
            os.remove(file_path)
            
            # Log upload action
            log_query(f"Uploaded {file.filename}", f"Added {chunks_added} chunks", [], 0.0, username, "upload")
            
        return {"message": "Files processed successfully", "chunks_added": total_chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=QueryResponse)
async def chat(request: QueryRequest):
    """Endpoint to handle user queries."""
    start_time = time.time()
    
    try:
        # 1. Retrieve context
        context_docs = retrieve_context(request.query)
        context_text = "\n\n".join([doc.page_content for doc in context_docs])
        
        # 2. Generate response using local Ollama
        answer = generate_response(request.query, context_text, request.chat_history)
        
        # 3. Detect Hallucination
        is_hallucination = detect_hallucinations(request.query, answer, context_text)
        
        processing_time = time.time() - start_time
        
        # 4. Log to MongoDB
        log_query(request.query, answer, context_docs, processing_time, request.username, "query")
        
        return {
            "answer": answer,
            "sources": [{"content": doc.page_content[:200] + "...", "source": doc.metadata.get("source", "unknown")} for doc in context_docs],
            "processing_time": round(processing_time, 2),
            "flagged_hallucination": is_hallucination
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    """Endpoint to view dashboard metrics."""
    return monitor_accuracy()

@app.post("/register")
async def register(auth: UserAuth):
    if register_user(auth.username, auth.password):
        return {"message": "User registered successfully"}
    raise HTTPException(status_code=400, detail="Username already exists")

@app.post("/login")
async def login(auth: UserAuth):
    if verify_user(auth.username, auth.password):
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/user/actions")
async def fetch_user_actions(username: str):
    return {"actions": get_user_actions(username)}

class ChatSession(BaseModel):
    session_id: str
    title: str
    messages: list
    username: str = "guest"

@app.post("/sessions")
async def save_session(session: ChatSession):
    from database import save_chat_session
    save_chat_session(session.username, session.session_id, session.title, session.messages)
    return {"status": "success"}

@app.get("/sessions")
async def get_sessions(username: str):
    from database import get_chat_sessions
    return {"sessions": get_chat_sessions(username)}

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, username: str):
    from database import delete_chat_session
    delete_chat_session(username, session_id)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
