from flask import Blueprint, request, jsonify
from app.db import get_db
from google import genai
from google.genai import types
import os
import json
import re

history_ai_bp = Blueprint("history_ai", __name__, url_prefix="/api")


def get_user_email():
    return request.headers.get("X-User-Email", "").strip()


def safe_iso(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def clean_json_response(text):
    text = text.strip()
    text = re.sub(r"^```json", "", text)
    text = re.sub(r"^```", "", text)
    text = re.sub(r"```$", "", text)
    return text.strip()


def get_user_by_email(db, email):
    return db.users.find_one({
        "$or": [
            {"email": email},
            {"emailLower": email.lower()}
        ]
    })


def get_user_bookings(db, user):
    user_id = user["_id"]
    email = user.get("email", "")

    return list(db.bookings.find({
        "$or": [
            {"userId": user_id},       # real checkout booking.py format
            {"customerId": user_id},   # seed.py format
            {"email": email},          # real checkout format
            {"user_email": email}      # older fallback format
        ]
    }).sort("createdAt", -1))


def get_ticket_details(db, booking_id):
    tickets = list(db.tickets.find({"bookingId": booking_id}))
    seat_labels = []
    ticket_counts = {}

    for ticket in tickets:
        ticket_type = ticket.get("ticketType") or ticket.get("type") or "UNKNOWN"
        ticket_counts[ticket_type] = ticket_counts.get(ticket_type, 0) + 1

        seat = db.seats.find_one({"_id": ticket.get("seatId")})
        if seat:
            seat_labels.append(f"{seat.get('row', '')}{seat.get('seatNumber', '')}")

    return seat_labels, ticket_counts


@history_ai_bp.get("/orders/history")
def get_order_history():
    user_email = get_user_email()

    if not user_email:
        return jsonify({
            "success": False,
            "message": "Missing X-User-Email header."
        }), 400

    db = get_db()

    user = get_user_by_email(db, user_email)

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    bookings = get_user_bookings(db, user)
    order_history = []

    for booking in bookings:
        show = db.shows.find_one({"_id": booking.get("showId")})
        movie = None
        showroom = None

        if show:
            movie = db.movies.find_one({"_id": show.get("movieId")})
            showroom = db.showrooms.find_one({"_id": show.get("showroomId")})

        seats, ticket_counts = get_ticket_details(db, booking.get("_id"))

        order_history.append({
            "orderId": str(booking.get("_id")),
            "movieId": str(movie.get("_id")) if movie else None,
            "movieTitle": movie.get("title") if movie else "Unknown Movie",
            "posterUrl": movie.get("poster_url") if movie else None,
            "trailerUrl": movie.get("trailer_url") if movie else None,
            "genre": movie.get("genre") if movie else None,
            "rating": movie.get("rating") if movie else None,
            "showDate": show.get("date") if show else None,
            "showTime": show.get("time") if show else None,
            "showroom": showroom.get("name") if showroom else None,
            "seats": seats,
            "ticketCounts": ticket_counts,
            "total": booking.get("totalPrice", 0),
            "status": booking.get("status", "confirmed"),
            "createdAt": safe_iso(booking.get("createdAt") or booking.get("bookingDate"))
        })

    return jsonify({
        "success": True,
        "orders": order_history
    }), 200


@history_ai_bp.post("/recommendations")
def get_ai_recommendations():
    user_email = get_user_email()

    if not user_email:
        return jsonify({
            "success": False,
            "message": "Missing X-User-Email header."
        }), 400

    db = get_db()

    user = get_user_by_email(db, user_email)

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    bookings = get_user_bookings(db, user)

    watched_titles = []
    watched_genres = []

    for booking in bookings:
        show = db.shows.find_one({"_id": booking.get("showId")})
        if show:
            movie = db.movies.find_one({"_id": show.get("movieId")})
            if movie:
                watched_titles.append(movie.get("title"))
                watched_genres.append(movie.get("genre"))

    available_movies = list(db.movies.find({}))

    available_movie_titles = [
        movie.get("title")
        for movie in available_movies
        if movie.get("title") and movie.get("title") not in watched_titles
    ]

    if not available_movie_titles:
        return jsonify({
            "success": True,
            "recommendations": []
        }), 200

    prompt = f"""
    You are a movie recommendation assistant for a cinema e-booking system.

    User's previously booked movies:
    {watched_titles}

    User's previous genres:
    {watched_genres}

    Available movies:
    {available_movie_titles}

    Recommend exactly 3 movie titles from the available movies list.
    Only choose titles that appear in the available movies list.
    Return ONLY a JSON array of exactly 3 strings.
    Example:
    ["Movie Title 1", "Movie Title 2", "Movie Title 3"]
    """
    
    source = "gemini"

    try:
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise Exception("Missing GEMINI_API_KEY")

        client = genai.Client(api_key=api_key)
        
        print("WATCHED TITLES:", watched_titles)
        print("WATCHED GENRES:", watched_genres)
        print("AVAILABLE MOVIES:", available_movie_titles)
        print("AI PROMPT:", prompt)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        print("GEMINI RAW RESPONSE:", response.text)

        cleaned_text = clean_json_response(response.text)
        recommended_titles = json.loads(cleaned_text)

    except Exception as e:
        print("Gemini failed, using fallback:", str(e))
        source = "fallback"
        recommended_titles = available_movie_titles[:3]

    final_recommendations = []

    for title in recommended_titles[:3]:
        movie = db.movies.find_one({"title": title})

        if movie:
            final_recommendations.append({
                "movieId": str(movie.get("_id")),
                "title": movie.get("title"),
                "posterUrl": movie.get("poster_url"),
                "trailerUrl": movie.get("trailer_url"),
                "genre": movie.get("genre"),
                "rating": movie.get("rating"),
                "description": movie.get("description", ""),
                "reason": "Recommended based on your order history."
            })

    return jsonify({
    "success": True,
    "source": source,
    "basedOn": {
        "watchedTitles": watched_titles,
        "watchedGenres": watched_genres
    },
    "recommendations": final_recommendations
}), 200