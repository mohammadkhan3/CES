import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from cryptography.fernet import Fernet, InvalidToken
from flask import Blueprint, jsonify, request

from app.db import get_addresses_collection, get_movies_collection, get_users_collection
from app.services.email import send_profile_update_email
from app.utils import movie_to_json

profile_bp = Blueprint("profile", __name__)


# -----------------------------
# Encryption helpers
# -----------------------------
def _get_cipher() -> Fernet:
    key = os.getenv("PAYMENT_CARD_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("PAYMENT_CARD_ENCRYPTION_KEY is not configured")
    return Fernet(key.encode("utf-8"))


def _encrypt_value(value: str) -> str:
    if not value:
        return ""
    return _get_cipher().encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt_value(value: str) -> str:
    if not value:
        return ""
    try:
        return _get_cipher().decrypt(value.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        # Allows older/plaintext seed data to still display
        return value


# -----------------------------
# Current user lookup
# -----------------------------
def _get_current_user() -> Optional[Dict[str, Any]]:
    """
    Demo-friendly current-user lookup since auth/login is not fully wired yet.
    Priority:
    1. X-User-Email header
    2. first ACTIVE customer
    3. first customer
    """
    users = get_users_collection()

    x_user_email = request.headers.get("X-User-Email", "").strip()
    if x_user_email:
        user = users.find_one({"emailLower": x_user_email.lower()})
        if user:
            return user

        user = users.find_one({"email": x_user_email})
        if user:
            return user

    user = users.find_one({"role": "customer", "status": "ACTIVE"})
    if user:
        return user

    return users.find_one({"role": "customer"})


# -----------------------------
# Address helpers
# -----------------------------
def _normalize_address_payload(address_payload: Any) -> Dict[str, str]:
    if isinstance(address_payload, dict):
        return {
            "street": str(address_payload.get("street", "")).strip(),
            "city": str(address_payload.get("city", "")).strip(),
            "state": str(address_payload.get("state", "")).strip(),
            "zipCode": str(address_payload.get("zipCode", "")).strip(),
        }

    if isinstance(address_payload, str):
        parts = [p.strip() for p in address_payload.split(",")]
        return {
            "street": parts[0] if len(parts) > 0 else "",
            "city": parts[1] if len(parts) > 1 else "",
            "state": parts[2] if len(parts) > 2 else "",
            "zipCode": parts[3] if len(parts) > 3 else "",
        }

    return {"street": "", "city": "", "state": "", "zipCode": ""}


def _address_is_empty(address_doc: Dict[str, str]) -> bool:
    return not any(
        [
            address_doc.get("street", "").strip(),
            address_doc.get("city", "").strip(),
            address_doc.get("state", "").strip(),
            address_doc.get("zipCode", "").strip(),
        ]
    )


def _resolve_user_address(user: Dict[str, Any]) -> Dict[str, str]:
    raw = user.get("mailingAddress")

    if not raw:
        return {"street": "", "city": "", "state": "", "zipCode": ""}

    if isinstance(raw, dict):
        return {
            "street": str(raw.get("street", "")).strip(),
            "city": str(raw.get("city", "")).strip(),
            "state": str(raw.get("state", "")).strip(),
            "zipCode": str(raw.get("zipCode", "")).strip(),
        }

    try:
        address_id = raw if isinstance(raw, ObjectId) else ObjectId(raw)
        address_doc = get_addresses_collection().find_one({"_id": address_id})
        if address_doc:
            return {
                "street": str(address_doc.get("street", "")).strip(),
                "city": str(address_doc.get("city", "")).strip(),
                "state": str(address_doc.get("state", "")).strip(),
                "zipCode": str(address_doc.get("zipCode", "")).strip(),
            }
    except Exception:
        pass

    return {"street": "", "city": "", "state": "", "zipCode": ""}


def _save_user_address(user: Dict[str, Any], address_doc: Dict[str, str]) -> Any:
    """
    Save exactly one address.
    If mailingAddress currently points to an address ObjectId, update that doc.
    Otherwise store inline on the user document.
    If an empty address is intentionally sent, this clears the address.
    """
    existing = user.get("mailingAddress")

    if _address_is_empty(address_doc):
        return None

    try:
        existing_id = existing if isinstance(existing, ObjectId) else ObjectId(existing)
        get_addresses_collection().update_one(
            {"_id": existing_id},
            {"$set": address_doc},
            upsert=True,
        )
        return existing_id
    except Exception:
        return address_doc


# -----------------------------
# Card helpers
# -----------------------------
def _normalize_cards_payload(cards_payload: Any) -> List[Dict[str, str]]:
    if not isinstance(cards_payload, list):
        return []

    normalized = []
    for i, card in enumerate(cards_payload):
        if not isinstance(card, dict):
            continue

        raw_number = str(card.get("cardNumber", "")).replace(" ", "").strip()
        exp = str(card.get("expirationDate", card.get("exp", ""))).strip()
        name_on_card = str(card.get("nameOnCard", "")).strip()
        billing_zip = str(card.get("billingZip", "")).strip()

        # fallback for simplified payloads
        if not raw_number:
            raw_number = str(card.get("last4", "")).strip()

        normalized.append(
            {
                "id": str(card.get("id", i + 1)),
                "cardNumber": raw_number,
                "expirationDate": exp,
                "nameOnCard": name_on_card,
                "billingZip": billing_zip,
            }
        )

    return normalized


def _encrypt_cards(cards: List[Dict[str, str]]) -> List[Dict[str, str]]:
    encrypted_cards = []

    for card in cards:
        number = card.get("cardNumber", "").strip()
        last4 = number[-4:] if number else ""

        encrypted_cards.append(
            {
                "id": card.get("id", ""),
                "cardNumberEncrypted": _encrypt_value(number),
                "expirationDateEncrypted": _encrypt_value(card.get("expirationDate", "")),
                "nameOnCardEncrypted": _encrypt_value(card.get("nameOnCard", "")),
                "billingZipEncrypted": _encrypt_value(card.get("billingZip", "")),
                "last4": last4,
                "updatedAt": datetime.utcnow(),
            }
        )

    return encrypted_cards


def _cards_for_frontend(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    response_cards = []

    for i, card in enumerate(cards):
        exp = ""
        if card.get("expirationDateEncrypted"):
            exp = _decrypt_value(card.get("expirationDateEncrypted", ""))

        if not exp:
            exp = str(card.get("expirationDate", "")).strip()

        last4 = str(card.get("last4", "")).strip()

        if not last4 and card.get("cardNumberEncrypted"):
            raw = _decrypt_value(card.get("cardNumberEncrypted", ""))
            last4 = raw[-4:] if raw else ""

        if not last4 and card.get("cardNumber"):
            raw = str(card.get("cardNumber", "")).strip()
            last4 = raw[-4:] if raw else ""

        response_cards.append(
            {
                "id": card.get("id", i + 1),
                "last4": last4,
                "exp": exp,
            }
        )

    return response_cards


# -----------------------------
# Favorites helpers
# -----------------------------
def _favorite_movies_for_frontend(user: Dict[str, Any]) -> List[Dict[str, Any]]:
    favorite_ids = user.get("favoriteMovies", [])
    if not favorite_ids:
        return []

    object_ids = []
    for value in favorite_ids:
        try:
            object_ids.append(value if isinstance(value, ObjectId) else ObjectId(value))
        except Exception:
            continue

    if not object_ids:
        return []

    movies = get_movies_collection().find({"_id": {"$in": object_ids}})
    return [movie_to_json(doc) for doc in movies]


# -----------------------------
# Routes
# -----------------------------
@profile_bp.get("/profile")
def get_profile():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    first_name = str(user.get("firstName", "")).strip()
    last_name = str(user.get("lastName", "")).strip()
    full_name = f"{first_name} {last_name}".strip()

    address_doc = _resolve_user_address(user)
    address_string = ", ".join(
        [
            part
            for part in [
                address_doc["street"],
                address_doc["city"],
                address_doc["state"],
                address_doc["zipCode"],
            ]
            if part
        ]
    )

    response = {
        "name": full_name,
        "firstName": first_name,
        "lastName": last_name,
        "email": str(user.get("email", "")).strip(),
        "phone": str(user.get("phone", "")).strip(),
        "address": address_string,
        "mailingAddress": address_doc,
        "cards": _cards_for_frontend(user.get("paymentCards", [])),
        "favorites": _favorite_movies_for_frontend(user),
    }
    return jsonify(response), 200


@profile_bp.put("/profile")
def update_profile():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json(silent=True) or {}

    update_fields: Dict[str, Any] = {
        "updatedAt": datetime.utcnow(),
    }

    # -----------------------------
    # Partial name updates
    # -----------------------------
    if "firstName" in data:
        update_fields["firstName"] = str(data.get("firstName", "")).strip()

    if "lastName" in data:
        update_fields["lastName"] = str(data.get("lastName", "")).strip()

    # Optional full-name support
    if "name" in data and "firstName" not in data and "lastName" not in data:
        full_name = str(data.get("name", "")).strip()
        if full_name:
            parts = full_name.split()
            update_fields["firstName"] = parts[0]
            update_fields["lastName"] = " ".join(parts[1:]) if len(parts) > 1 else ""

    # -----------------------------
    # Partial phone update
    # -----------------------------
    if "phone" in data:
        update_fields["phone"] = str(data.get("phone", "")).strip()

    # -----------------------------
    # Email must NOT be editable
    # -----------------------------
    # Ignore incoming email completely

    # -----------------------------
    # Partial address update
    # -----------------------------
    if "mailingAddress" in data or "address" in data:
        address_payload = data.get("mailingAddress", data.get("address", ""))
        address_doc = _normalize_address_payload(address_payload)
        saved_address_value = _save_user_address(user, address_doc)
        update_fields["mailingAddress"] = saved_address_value

    # -----------------------------
    # Partial cards update
    # -----------------------------
    if "cards" in data or "paymentCards" in data:
        cards_payload = _normalize_cards_payload(
            data.get("cards", data.get("paymentCards", []))
        )

        if len(cards_payload) > 3:
            return jsonify({"message": "Users cannot store more than 3 payment cards."}), 400

        update_fields["paymentCards"] = _encrypt_cards(cards_payload)

    get_users_collection().update_one(
        {"_id": user["_id"]},
        {"$set": update_fields},
    )

    try:
        send_profile_update_email(str(user.get("email", "")).strip())
    except Exception:
        pass

    return jsonify({"message": "Profile updated successfully."}), 200


@profile_bp.post("/profile/favorites/<movie_id>")
def add_favorite(movie_id: str):
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        movie_obj_id = ObjectId(movie_id)
    except Exception:
        return jsonify({"message": "Invalid movie id."}), 400

    movie = get_movies_collection().find_one({"_id": movie_obj_id})
    if not movie:
        return jsonify({"message": "Movie not found."}), 404

    get_users_collection().update_one(
        {"_id": user["_id"]},
        {"$addToSet": {"favoriteMovies": movie_obj_id}},
    )

    return jsonify({"message": "Movie added to favorites."}), 200


@profile_bp.delete("/profile/favorites/<movie_id>")
def remove_favorite(movie_id: str):
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        movie_obj_id = ObjectId(movie_id)
    except Exception:
        return jsonify({"message": "Invalid movie id."}), 400

    get_users_collection().update_one(
        {"_id": user["_id"]},
        {"$pull": {"favoriteMovies": movie_obj_id}},
    )

    return jsonify({"message": "Movie removed from favorites."}), 200