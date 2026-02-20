from flask import Blueprint, request, jsonify
from bson import ObjectId
from app.db import get_movies_collection
from app.utils import movie_to_json


movies_bp = Blueprint("movies", __name__)

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

    movies = get_movies_collection()
    cursor = movies.find({"title": {"$regex": title, "$options": "i"}})

    results = [movie_to_json(doc) for doc in cursor]
    return jsonify({"data": results}), 200

# 2.4 Filter function
@movies_bp.get("/movies/filter")
def filter_movies():
    genre = request.args.get("genre", "").strip()
    if not genre:
        return jsonify({"message": "Missing required param: genre"}), 400

    movies = get_movies_collection()
    cursor = movies.find({"genre": {"$regex": f"^{genre}$", "$options": "i"}})

    results = [movie_to_json(doc) for doc in cursor]
    return jsonify({"data": results}), 200