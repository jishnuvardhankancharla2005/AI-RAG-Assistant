<<<<<<< HEAD
# Enterprise Generative AI RAG Assistant

A fully functional RAG (Retrieval-Augmented Generation) application built using Google AI Studio (Gemini Embeddings), local LLM (Ollama Mistral), LangChain, FAISS, and MongoDB. The frontend is an extraordinarily styled React application using Vite.

## Architecture & Tech Stack

1. **Frontend**: Vite + React + Vanilla CSS (Glassmorphism, Dark Theme)
2. **Backend**: FastAPI (Python)
3. **Embeddings**: Google Gemini API (`models/embedding-001`)
4. **Vector Database**: FAISS (Local)
5. **LLM**: Local Ollama running `mistral`
6. **Metadata Database**: MongoDB (Tracking query logs, hallucination flags, metrics)
7. **Pipeline Orchestration**: LangChain

## Features Included

- **Data Ingestion**: Upload PDFs and text files from the frontend UI. Text is cleaned and chunked (LangChain).
- **Embeddings & Vector Store**: Processed chunks are vectorized via Gemini Embeddings and stored in FAISS.
- **RAG Retrieval & Generation**: Retrieves top-k similar chunks and generates highly contextual answers using Ollama Mistral.
- **Database Logs**: Records queries, processing times, and dynamically attempts to flag hallucinations via MongoDB.
- **Extraordinary UI**: High-end glassmorphic dark-mode interface.
- **Dockerized**: Full deployment pipeline included via `docker-compose`.

## Setup & Run Instructions

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (if running frontend locally outside docker)
- Python 3.10+ (if running backend locally outside docker)
- MongoDB running locally at port 27017
- Ollama installed locally with the Mistral model:
  ```bash
  ollama pull mistral
  ```

### 2. Environment Setup

In the `backend/` folder, create a `.env` file based on `.env.example`:
```
GOOGLE_API_KEY=your_gemini_api_key_here
MONGO_URI=mongodb://localhost:27017/ 
# Use mongodb://mongo:27017/ if running in docker
```

### 3. Run Locally (Development)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Run via Docker Compose

```bash
docker-compose up --build
```
*Note: Depending on your OS, you might need to adjust Docker network settings so the containers can reach your local host's Ollama instance, or use the Ollama container bundled in the docker-compose file.*
=======
# AI-RAG-Assistant
>>>>>>> 729e736016391ac28644a1c25596d58f0ba3c8ed
