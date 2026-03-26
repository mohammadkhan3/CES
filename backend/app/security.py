import os
from typing import Final
import bcrypt

_DEFAULT_ROUNDS: Final[int] = int(os.getenv("BCRYPT_ROUNDS", "12"))


def hash_password(plain_password: str) -> str:
    if not isinstance(plain_password, str) or not plain_password:
        raise ValueError("Password must be a non-empty string")

    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=_DEFAULT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False

    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )
