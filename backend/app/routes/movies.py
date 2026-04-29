from flask import Blueprint, jsonify, request

from app.services.movies import MovieError, filter_movies, get_homepage, get_movie_details, get_movie_showtimes, list_all_movies, search_movies

movies_bp = Blueprint("movies", __name__)


@movies_bp.get("/movies")
def list_all_movies_route():
    return jsonify(list_all_movies()), 200


@movies_bp.get("/movies/homepage")
def get_homepage_route():
    return jsonify({"data": get_homepage()}), 200


@movies_bp.get("/movies/<string:movie_id>")
def get_movie_details_route(movie_id: str):
    try:
        data = get_movie_details(movie_id)
    except MovieError as e:
        return jsonify({"message": e.message}), e.status
    return jsonify({"data": data}), 200


@movies_bp.get("/movies/<string:movie_id>/showtimes")
def get_movie_showtimes_route(movie_id: str):
    try:
        data = get_movie_showtimes(movie_id)
    except MovieError as e:
        return jsonify({"message": e.message}), e.status
    return jsonify({"data": data}), 200


@movies_bp.get("/movies/search")
def search_movies_route():
    title = request.args.get("title", "").strip()
    try:
        results = search_movies(title)
    except MovieError as e:
        return jsonify({"message": e.message}), e.status

    if not results:
        return jsonify({"message": "No movies match your search", "data": []}), 200

    return jsonify({"data": results}), 200


@movies_bp.get("/movies/filter")
def filter_movies_route():
    genre = request.args.get("genre", "").strip()
    try:
        results = filter_movies(genre)
    except MovieError as e:
        return jsonify({"message": e.message}), e.status

    if not results:
        return jsonify({"message": "No movies match the filter criteria", "data": []}), 200

    return jsonify({"data": results}), 200
