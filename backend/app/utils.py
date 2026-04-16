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
    """Normalize a showtime document to the API contract shape.

    Returns the nested ``showroom: {id, name}`` structure and a ``display``
    string that the frontend MovieModal component expects.
    """
    showroom_id   = str(show_doc.get("showroomId", ""))
    showroom_name = (showroom_doc or {}).get("name", "")
    date          = show_doc.get("date", "")
    time          = show_doc.get("time", "")
    display       = f"{date} {time} – {showroom_name}".strip() if showroom_name else f"{date} {time}".strip()

    return {
        "id":       str(show_doc["_id"]),
        "movie_id": str(show_doc.get("movieId", "")),
        "date":     date,
        "time":     time,
        "duration": show_doc.get("duration", 0),
        "showroom": {
            "id":   showroom_id,
            "name": showroom_name,
        },
        "display": display,
    }