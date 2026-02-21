import os
import certifi
from pymongo import MongoClient

def get_movies_collection():
    uri = os.getenv("MONGO_URI")  
    db_name = os.getenv("MONGO_DB", "ces_db")
    client = MongoClient(uri, tlsCAFile=certifi.where())
    db = client[db_name]
    return db["movies"] 
