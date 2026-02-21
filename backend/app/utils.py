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