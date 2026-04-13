import re
from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.db import get_movies_collection, get_shows_collection, get_showrooms_collection
from app.utils import movie_to_json

movies_bp = Blueprint("movies", __name__)

# 2.1 Home Page Function
@movies_bp.get("/movies/homepage")
def get_homepage():
    movies = get_movies_collection()
    
    currently_running = movies.find({"status": "currently_running"})
    coming_soon = movies.find({"status": "coming_soon"})
    
    return jsonify({
        "data": {
            "currently_running": [movie_to_json(doc) for doc in currently_running],
            "coming_soon": [movie_to_json(doc) for doc in coming_soon]
        }
    }), 200

# 2.2 Movie details function
@movies_bp.get("/movies/<string:movie_id>")
def get_movie_details(movie_id: str):
    try:
        oid = ObjectId(movie_id)
    except Exception:
        return jsonify({"message": "Invalid movie id"}), 400

    movies = get_movies_collection()
    doc = movies.find_one({"_id": oid})

    if not doc:
        return jsonify({"message": "Movie not found"}), 404

    return jsonify({"data": movie_to_json(doc)}), 200


# 2.3 Search title function
@movies_bp.get("/movies/search")
def search_movies():
    title = request.args.get("title", "").strip()
    if not title:
        return jsonify({"message": "Missing required param: title"}), 400

    safe_title = re.escape(title)

    movies = get_movies_collection()
    cursor = movies.find({
        "title": {"$regex": safe_title, "$options": "i"}
    })

    results = [movie_to_json(doc) for doc in cursor]

    if not results:
        return jsonify({
            "message": "No movies match your search",
            "data": []
        }), 200

    return jsonify({"data": results}), 200


# 2.4 Filter function
@movies_bp.get("/movies/filter")
def filter_movies():
    genre = request.args.get("genre", "").strip()
    if not genre:
        return jsonify({"message": "Missing required param: genre"}), 400

    safe_genre = re.escape(genre)

    movies = get_movies_collection()
    cursor = movies.find({
        "genre": {"$regex": f"^{safe_genre}$", "$options": "i"}
    })

    results = [movie_to_json(doc) for doc in cursor]

    if not results:
        return jsonify({
            "message": "No movies match the filter criteria",
            "data": []
        }), 200

    return jsonify({"data": results}), 200

#2.5 Showtime function
@movies_bp.get("/movies/<string:movie_id>/showtimes")
def get_movie_showtimes(movie_id: str):
    try:
        movie_obj_id = ObjectId(movie_id)
    except Exception:
        return jsonify({"message": "Invalid movie id"}), 400

    movies = get_movies_collection()
    movie = movies.find_one({"_id": movie_obj_id})

    if not movie:
        return jsonify({"message": "Movie not found"}), 404

    shows = list(get_shows_collection().find({"movieId": movie_obj_id}))
    showrooms = {
        showroom["_id"]: showroom
        for showroom in get_showrooms_collection().find({})
    }

    data = []
    for show in shows:
        showroom = showrooms.get(show.get("showroomId"))
        data.append({
            "id": str(show["_id"]),
            "date": str(show.get("date", "")).strip(),
            "time": str(show.get("time", "")).strip(),
            "duration": show.get("duration"),
            "showroom": {
                "id": str(showroom["_id"]) if showroom else "",
                "name": str(showroom.get("name", "")).strip() if showroom else "",
            },
            "display": f'{str(show.get("date", "")).strip()} {str(show.get("time", "")).strip()}'
        })

    data.sort(key=lambda s: (s["date"], s["time"]))

    return jsonify({"data": data}), 200