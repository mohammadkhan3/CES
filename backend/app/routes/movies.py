import re
from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.db import get_movies_collection, get_shows_collection, get_showrooms_collection
from app.utils import movie_to_json, showtime_to_json, showtimes_response_to_json

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


@movies_bp.get("/movies/<string:movie_id>/showtimes")
def get_movie_showtimes(movie_id: str):
    try:
        movie_oid = ObjectId(movie_id)
    except Exception:
        return jsonify({"message": "Invalid movie id"}), 400

    movies = get_movies_collection()
    movie_doc = movies.find_one({"_id": movie_oid})
    if not movie_doc:
        return jsonify({"message": "Movie not found"}), 404

    shows = get_shows_collection()
    showrooms = get_showrooms_collection()

    show_docs = list(shows.find({"movieId": movie_oid}))

    showroom_ids = [doc.get("showroomId") for doc in show_docs if doc.get("showroomId")]
    showroom_map = {}
    if showroom_ids:
        for showroom_doc in showrooms.find({"_id": {"$in": showroom_ids}}):
            showroom_map[str(showroom_doc["_id"])] = showroom_doc

    showtime_list = []
    for show_doc in show_docs:
        showroom_doc = showroom_map.get(str(show_doc.get("showroomId", "")))
        showtime_list.append(showtime_to_json(show_doc, showroom_doc))

    showtime_list.sort(key=lambda item: (item.get("date", ""), item.get("time", "")))

    return jsonify({"data": showtimes_response_to_json(movie_doc, showtime_list)}), 200


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