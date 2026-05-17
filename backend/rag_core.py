import os
import re
from typing import List, Dict, Any
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv

load_dotenv()

# Global FAISS index placeholder
vector_db_instance = None

def load_documents(file_path: str) -> List[Any]:
    """Load documents from PDF or Text."""
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path, encoding='utf-8')
    return loader.load()

def clean_text(text: str) -> str:
    """Clean the text from multiple spaces, newlines, etc."""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

def chunk_text(documents: List[Any], chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Any]:
    """Split documents into chunks."""
    for doc in documents:
        doc.page_content = clean_text(doc.page_content)
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    return text_splitter.split_documents(documents)

def generate_embeddings() -> OllamaEmbeddings:
    """Initialize local Ollama Embeddings."""
    return OllamaEmbeddings(model="mistral")

def store_embeddings(chunks: List[Any]) -> FAISS:
    """Create FAISS vector database from text chunks."""
    global vector_db_instance
    embeddings = generate_embeddings()
    vector_db = FAISS.from_documents(chunks, embeddings)
    
    if vector_db_instance is None:
        vector_db_instance = vector_db
    else:
        vector_db_instance.merge_from(vector_db)
        
    # Save locally
    vector_db_instance.save_local("faiss_index")
    return vector_db_instance

def load_vector_db() -> FAISS:
    """Load FAISS index if exists."""
    global vector_db_instance
    if vector_db_instance is not None:
        return vector_db_instance
    
    if os.path.exists("faiss_index"):
        embeddings = generate_embeddings()
        vector_db_instance = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
        return vector_db_instance
    return None

def retrieve_context(query: str, k: int = 2) -> List[Any]:
    """Retrieve top-k relevant chunks."""
    db = load_vector_db()
    if not db:
        return []
    
    # Retrieve with score to potentially filter
    docs_and_scores = db.similarity_search_with_score(query, k=k)
    # returning just docs for simple context
    docs = [doc for doc, score in docs_and_scores]
    return docs

def generate_response(query: str, context: str, chat_history: list = None) -> str:
    """Generate response using local Ollama Mistral based on retrieved context and history."""
    # Using local Mistral model
    llm = Ollama(model="mistral")
    
    # Format chat history
    history_str = ""
    if chat_history:
        for msg in chat_history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_str += f"{role}: {msg.get('content')}\n"
    
    prompt_template = """
    You are an elite, highly advanced Enterprise AI Architecture Assistant. Your goal is to provide deeply analytical, structured, and highly accurate responses based strictly on the provided context.
    
    When answering:
    1. Structure your response using markdown with clear headings, bullet points, or numbered lists to make it highly readable and professional.
    2. Provide deep, insightful analysis rather than just surface-level summarization. 
    3. If the user's question involves code, technical concepts, or processes, explain them clearly and step-by-step.
    4. If the exact answer cannot be definitively found or inferred from the context, clearly state what information is missing, but offer the closest analytical approximation based on what IS available. Do not hallucinate external facts.

    Chat History:
    {chat_history}
    
    Context:
    {context}
    
    Question: {query}
    
    Advanced Analysis & Answer:
    """
    
    prompt = PromptTemplate(template=prompt_template, input_variables=["chat_history", "context", "query"])
    chain = prompt | llm
    
    response = chain.invoke({"chat_history": history_str, "context": context, "query": query})
    return response

def process_and_store_file(file_path: str):
    """Pipeline to ingest a single file."""
    docs = load_documents(file_path)
    chunks = chunk_text(docs)
    store_embeddings(chunks)
    return len(chunks)
