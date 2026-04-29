import re

from bson import ObjectId

from app.db import get_movies_collection, get_shows_collection, get_showrooms_collection
from app.utils import movie_to_json, showtime_to_json


class MovieError(Exception):
    def __init__(self, message: str, status: int = 400):
        self.message = message
        self.status = status
        super().__init__(message)


def list_all_movies() -> list:
    cursor = get_movies_collection().find({}, {"title": 1, "status": 1})
    return [
        {
            "_id":    str(doc["_id"]),
            "id":     str(doc["_id"]),
            "title":  doc.get("title", ""),
            "status": doc.get("status", ""),
        }
        for doc in cursor
    ]


def get_homepage() -> dict:
    movies = get_movies_collection()
    return {
        "currently_running": [movie_to_json(doc) for doc in movies.find({"status": "currently_running"})],
        "coming_soon":       [movie_to_json(doc) for doc in movies.find({"status": "coming_soon"})],
    }


def get_movie_details(movie_id: str) -> dict:
    try:
        oid = ObjectId(movie_id)
    except Exception:
        raise MovieError("Invalid movie id")

    doc = get_movies_collection().find_one({"_id": oid})
    if not doc:
        raise MovieError("Movie not found", 404)

    return movie_to_json(doc)


def get_movie_showtimes(movie_id: str) -> list:
    try:
        movie_oid = ObjectId(movie_id)
    except Exception:
        raise MovieError("Invalid movie id")

    movie_doc = get_movies_collection().find_one({"_id": movie_oid})
    if not movie_doc:
        raise MovieError("Movie not found", 404)

    show_docs = list(get_shows_collection().find({"movieId": movie_oid}))

    showroom_ids = [doc.get("showroomId") for doc in show_docs if doc.get("showroomId")]
    showroom_map = {}
    if showroom_ids:
        for showroom_doc in get_showrooms_collection().find({"_id": {"$in": showroom_ids}}):
            showroom_map[str(showroom_doc["_id"])] = showroom_doc

    showtime_list = []
    for show_doc in show_docs:
        showroom_doc = showroom_map.get(str(show_doc.get("showroomId", "")))
        showtime_list.append(showtime_to_json(show_doc, showroom_doc))

    showtime_list.sort(key=lambda item: (item.get("date", ""), item.get("time", "")))
    return showtime_list


def search_movies(title: str) -> list:
    if not title:
        raise MovieError("Missing required param: title")

    cursor = get_movies_collection().find({
        "title": {"$regex": re.escape(title), "$options": "i"}
    })
    return [movie_to_json(doc) for doc in cursor]


def filter_movies(genre: str) -> list:
    if not genre:
        raise MovieError("Missing required param: genre")

    cursor = get_movies_collection().find({
        "genre": {"$regex": f"^{re.escape(genre)}$", "$options": "i"}
    })
    return [movie_to_json(doc) for doc in cursor]
