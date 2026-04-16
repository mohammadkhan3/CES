def movie_to_json(doc):
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "genre": doc.get("genre", ""),
        "status": doc.get("status", ""),
        "description": doc.get("description", ""),
        "rating": doc.get("rating", ""),
        "poster_url": doc.get("poster_url", ""),
        "trailer_url": doc.get("trailer_url", ""),
    }


def showtime_to_json(show_doc, showroom_doc=None):
    """Normalize a showtime document to the API contract shape."""
    return {
        "id": str(show_doc["_id"]),
        "movie_id": str(show_doc.get("movieId", "")),
        "showroom_id": str(show_doc.get("showroomId", "")),
        "showroom_name": (showroom_doc or {}).get("name", ""),
        "date": show_doc.get("date", ""),
        "time": show_doc.get("time", ""),
        "duration": show_doc.get("duration", 0),
    }


def showtimes_response_to_json(movie_doc, showtimes):
    """Build a predictable response envelope for movie showtimes."""
    return {
        "movie": movie_to_json(movie_doc),
        "showtimes": showtimes,
    }