import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from cryptography.fernet import Fernet, InvalidToken

from app.db import get_addresses_collection, get_movies_collection, get_users_collection
from app.security import hash_password, verify_password
from app.utils import movie_to_json

import re

_PASSWORD_COMPLEXITY = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


class ProfileError(Exception):
    def __init__(self, message: str, status: int = 400):
        self.message = message
        self.status = status
        super().__init__(message)


# ── Encryption helpers ────────────────────────────────────────────────────────

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
        return value


# ── Address helpers ───────────────────────────────────────────────────────────

def normalize_address_payload(address_payload: Any) -> Dict[str, str]:
    if isinstance(address_payload, dict):
        return {
            "street":  str(address_payload.get("street",  "")).strip(),
            "city":    str(address_payload.get("city",    "")).strip(),
            "state":   str(address_payload.get("state",   "")).strip(),
            "zipCode": str(address_payload.get("zipCode", "")).strip(),
        }

    if isinstance(address_payload, str):
        parts = [p.strip() for p in address_payload.split(",")]
        return {
            "street":  parts[0] if len(parts) > 0 else "",
            "city":    parts[1] if len(parts) > 1 else "",
            "state":   parts[2] if len(parts) > 2 else "",
            "zipCode": parts[3] if len(parts) > 3 else "",
        }

    return {"street": "", "city": "", "state": "", "zipCode": ""}


def _address_is_empty(address_doc: Dict[str, str]) -> bool:
    return not any([
        address_doc.get("street",  "").strip(),
        address_doc.get("city",    "").strip(),
        address_doc.get("state",   "").strip(),
        address_doc.get("zipCode", "").strip(),
    ])


def resolve_user_address(user: Dict[str, Any]) -> Dict[str, str]:
    raw = user.get("mailingAddress")

    if not raw:
        return {"street": "", "city": "", "state": "", "zipCode": ""}

    if isinstance(raw, dict):
        return {
            "street":  str(raw.get("street",  "")).strip(),
            "city":    str(raw.get("city",    "")).strip(),
            "state":   str(raw.get("state",   "")).strip(),
            "zipCode": str(raw.get("zipCode", "")).strip(),
        }

    try:
        address_id = raw if isinstance(raw, ObjectId) else ObjectId(raw)
        address_doc = get_addresses_collection().find_one({"_id": address_id})
        if address_doc:
            return {
                "street":  str(address_doc.get("street",  "")).strip(),
                "city":    str(address_doc.get("city",    "")).strip(),
                "state":   str(address_doc.get("state",   "")).strip(),
                "zipCode": str(address_doc.get("zipCode", "")).strip(),
            }
    except Exception:
        pass

    return {"street": "", "city": "", "state": "", "zipCode": ""}


def save_user_address(user: Dict[str, Any], address_doc: Dict[str, str]) -> Any:
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


# ── Card helpers ──────────────────────────────────────────────────────────────

def normalize_cards_payload(cards_payload: Any) -> List[Dict[str, str]]:
    if not isinstance(cards_payload, list):
        return []

    normalized = []
    for i, card in enumerate(cards_payload):
        if not isinstance(card, dict):
            continue

        raw_number   = str(card.get("cardNumber", "")).replace(" ", "").strip()
        exp          = str(card.get("expirationDate", card.get("exp", ""))).strip()
        name_on_card = str(card.get("nameOnCard", "")).strip()
        billing_zip  = str(card.get("billingZip",  "")).strip()

        if not raw_number:
            raw_number = str(card.get("last4", "")).strip()

        normalized.append({
            "id":             str(card.get("id", i + 1)),
            "cardNumber":     raw_number,
            "expirationDate": exp,
            "nameOnCard":     name_on_card,
            "billingZip":     billing_zip,
        })

    return normalized


def encrypt_cards(cards: List[Dict[str, str]]) -> List[Dict[str, str]]:
    encrypted_cards = []

    for card in cards:
        number = card.get("cardNumber", "").strip()
        last4  = number[-4:] if number else ""

        encrypted_cards.append({
            "id":                       card.get("id", ""),
            "cardNumberEncrypted":      _encrypt_value(number),
            "expirationDateEncrypted":  _encrypt_value(card.get("expirationDate", "")),
            "nameOnCardEncrypted":      _encrypt_value(card.get("nameOnCard",     "")),
            "billingZipEncrypted":      _encrypt_value(card.get("billingZip",     "")),
            "last4":                    last4,
            "updatedAt":                datetime.utcnow(),
        })

    return encrypted_cards


def cards_for_frontend(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    response_cards = []

    for i, card in enumerate(cards):
        exp = ""
        if card.get("expirationDateEncrypted"):
            exp = _decrypt_value(card.get("expirationDateEncrypted", ""))

        if not exp:
            exp = str(card.get("expirationDate", "")).strip()

        last4 = str(card.get("last4", "")).strip()

        if not last4 and card.get("cardNumberEncrypted"):
            raw   = _decrypt_value(card.get("cardNumberEncrypted", ""))
            last4 = raw[-4:] if raw else ""

        if not last4 and card.get("cardNumber"):
            raw   = str(card.get("cardNumber", "")).strip()
            last4 = raw[-4:] if raw else ""

        response_cards.append({
            "id":    card.get("id", i + 1),
            "last4": last4,
            "exp":   exp,
        })

    return response_cards


# ── Favorites helpers ─────────────────────────────────────────────────────────

def favorite_movies_for_frontend(user: Dict[str, Any]) -> List[Dict[str, Any]]:
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


# ── Service functions ─────────────────────────────────────────────────────────

def get_profile(user: Dict[str, Any]) -> dict:
    first_name = str(user.get("firstName", "")).strip()
    last_name  = str(user.get("lastName",  "")).strip()
    full_name  = f"{first_name} {last_name}".strip()

    address_doc = resolve_user_address(user)
    address_string = ", ".join(
        part for part in [
            address_doc["street"],
            address_doc["city"],
            address_doc["state"],
            address_doc["zipCode"],
        ]
        if part
    )

    return {
        "name":           full_name,
        "firstName":      first_name,
        "lastName":       last_name,
        "email":          str(user.get("email", "")).strip(),
        "phone":          str(user.get("phone", "")).strip(),
        "address":        address_string,
        "mailingAddress": address_doc,
        "cards":          cards_for_frontend(user.get("paymentCards", [])),
        "favorites":      favorite_movies_for_frontend(user),
    }


def update_profile(user: Dict[str, Any], data: dict) -> None:
    update_fields: Dict[str, Any] = {"updatedAt": datetime.utcnow()}

    if "firstName" in data:
        update_fields["firstName"] = str(data.get("firstName", "")).strip()

    if "lastName" in data:
        update_fields["lastName"] = str(data.get("lastName", "")).strip()

    if "name" in data and "firstName" not in data and "lastName" not in data:
        full_name = str(data.get("name", "")).strip()
        if full_name:
            parts = full_name.split()
            update_fields["firstName"] = parts[0]
            update_fields["lastName"]  = " ".join(parts[1:]) if len(parts) > 1 else ""

    if "phone" in data:
        update_fields["phone"] = str(data.get("phone", "")).strip()

    if "mailingAddress" in data or "address" in data:
        address_payload = data.get("mailingAddress", data.get("address", ""))
        address_doc = normalize_address_payload(address_payload)
        saved_address_value = save_user_address(user, address_doc)
        update_fields["mailingAddress"] = saved_address_value

    if "cards" in data or "paymentCards" in data:
        cards_payload = normalize_cards_payload(
            data.get("cards", data.get("paymentCards", []))
        )
        if len(cards_payload) > 3:
            raise ProfileError("Users cannot store more than 3 payment cards.")
        update_fields["paymentCards"] = encrypt_cards(cards_payload)

    new_password = str(data.get("newPassword", "") or "").strip()
    if new_password:
        current_password = str(data.get("currentPassword", "") or "").strip()
        if not current_password:
            raise ProfileError("Current password is required to change password.")

        if not _PASSWORD_COMPLEXITY.match(new_password):
            raise ProfileError(
                "New password must be at least 8 characters and include letters and numbers."
            )

        stored_user = get_users_collection().find_one({"_id": user["_id"]})
        if not stored_user or not verify_password(current_password, stored_user.get("password", "")):
            raise ProfileError("Current password is incorrect.", 401)

        update_fields["password"] = hash_password(new_password)

    get_users_collection().update_one(
        {"_id": user["_id"]},
        {"$set": update_fields},
    )


def add_favorite(user: Dict[str, Any], movie_id: str) -> None:
    try:
        movie_obj_id = ObjectId(movie_id)
    except Exception:
        raise ProfileError("Invalid movie id.")

    movie = get_movies_collection().find_one({"_id": movie_obj_id})
    if not movie:
        raise ProfileError("Movie not found.", 404)

    get_users_collection().update_one(
        {"_id": user["_id"]},
        {"$addToSet": {"favoriteMovies": movie_obj_id}},
    )


def remove_favorite(user: Dict[str, Any], movie_id: str) -> None:
    try:
        movie_obj_id = ObjectId(movie_id)
    except Exception:
        raise ProfileError("Invalid movie id.")

    get_users_collection().update_one(
        {"_id": user["_id"]},
        {"$pull": {"favoriteMovies": movie_obj_id}},
    )
