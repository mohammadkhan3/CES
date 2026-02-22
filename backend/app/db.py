import os
import certifi
from pymongo import MongoClient

_client = None

def get_client():
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise RuntimeError("MONGO_URI is not set")
        _client = MongoClient(uri, tls=True, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=30000)
    return _client

def get_movies_collection():
    db_name = os.getenv("MONGO_DB", "ces_db")
    client = get_client()
    db = client[db_name]
    return db["movies"]