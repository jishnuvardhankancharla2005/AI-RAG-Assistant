import os
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection with short timeout so it doesn't block the UI if DB is offline
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
db = client["rag_assistant"]
logs_collection = db["query_logs"]
users_collection = db["users"]

def log_query(query: str, response: str, sources: list, processing_time: float, username: str = "guest", action_type: str = "query"):
    """Log a user action (query or upload)."""
    log_entry = {
        "username": username,
        "action_type": action_type,
        "query": query,
        "response": response,
        "sources": [source.metadata.get("source", "unknown") for source in sources],
        "processing_time": processing_time,
        "timestamp": datetime.utcnow(),
        "flagged_hallucination": False, # Can be updated later by a separate process
        "user_feedback": None # For accuracy monitoring
    }
    try:
        logs_collection.insert_one(log_entry)
    except Exception as e:
        print(f"Warning: Could not log to MongoDB - {e}")

def monitor_accuracy():
    """Retrieve aggregate metrics on query feedback."""
    try:
        total_queries = logs_collection.count_documents({})
        positive_feedback = logs_collection.count_documents({"user_feedback": "positive"})
        negative_feedback = logs_collection.count_documents({"user_feedback": "negative"})
        accuracy = (positive_feedback / (positive_feedback + negative_feedback)) * 100 if (positive_feedback + negative_feedback) > 0 else 0
    except Exception:
        total_queries = 0
        positive_feedback = 0
        negative_feedback = 0
        accuracy = 0
        
    return {
        "total_queries": total_queries,
        "positive_feedback": positive_feedback,
        "negative_feedback": negative_feedback,
        "accuracy_score": accuracy
    }

def detect_hallucinations(query: str, response: str, context: str) -> bool:
    """
    A basic heuristic to detect potential hallucinations.
    In a full implementation, you would use an LLM-as-a-judge (like Gemini Pro) 
    to evaluate if the response is fully grounded in the context.
    """
    # Simple check: if response contains standard phrases indicating lack of knowledge, it's not a hallucination
    safe_phrases = ["I don't know", "The context does not provide", "not provided in the context"]
    if any(phrase.lower() in response.lower() for phrase in safe_phrases):
        return False
        
    # Here we would invoke a small LLM call to verify grounding, but for this demo, we assume false.
    return False

def update_hallucination_flag(query: str, flag: bool):
    try:
        logs_collection.update_many(
            {"query": query},
            {"$set": {"flagged_hallucination": flag}}
        )
    except Exception as e:
        print(f"Failed to update hallucination flag: {e}")

# --- New Session Management ---
def save_chat_session(username: str, session_id: str, title: str, messages: list):
    try:
        db.sessions.update_one(
            {"username": username, "session_id": session_id},
            {"$set": {"title": title, "messages": messages, "updated_at": datetime.utcnow()}},
            upsert=True
        )
    except Exception as e:
        print(f"Failed to save session: {e}")

def get_chat_sessions(username: str):
    try:
        sessions = list(db.sessions.find({"username": username}).sort("updated_at", -1))
        for s in sessions:
            s["_id"] = str(s["_id"])
        return sessions
    except Exception as e:
        print(f"Failed to get sessions: {e}")
        return []

def delete_chat_session(username: str, session_id: str):
    try:
        db.sessions.delete_one({"username": username, "session_id": session_id})
    except Exception as e:
        print(f"Failed to delete session: {e}")

def register_user(username, password):
    if users_collection.find_one({"username": username}):
        return False
    users_collection.insert_one({"username": username, "password": password})
    return True

def verify_user(username, password):
    user = users_collection.find_one({"username": username, "password": password})
    return user is not None

def get_user_actions(username: str, limit: int = 10):
    try:
        actions = list(logs_collection.find({"username": username}).sort("timestamp", -1).limit(limit))
        for action in actions:
            action["_id"] = str(action["_id"])
        return actions
    except Exception:
        return []
