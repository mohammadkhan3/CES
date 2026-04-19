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

def get_db():
    db_name = os.getenv("MONGO_DB", "ces_db")
    return get_client()[db_name]

def get_movies_collection():
    return get_db()["movies"]

def get_users_collection():
    return get_db()["users"]

def get_bookings_collection():
    return get_db()["bookings"]

def get_tickets_collection():
    return get_db()["tickets"]

def get_shows_collection():
    return get_db()["shows"]

def get_showrooms_collection():
    return get_db()["showrooms"]

def get_theatres_collection():
    return get_db()["theatres"]

def get_seats_collection():
    return get_db()["seats"]

def get_promotions_collection():
    return get_db()["promotions"]

def get_ticket_prices_collection():
    return get_db()["ticket_prices"]

def get_addresses_collection():
    return get_db()["addresses"]

def get_customer_preferences_collection():
    return get_db()["customer_preferences"]

def get_recommendations_collection():
    return get_db()["recommendations"]

def get_booking_history_collection():
    return get_db()["booking_history"]

def get_seat_reservations_collection():
    return get_db()["seat_reservations"]