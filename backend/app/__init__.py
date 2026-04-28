import os

from flask import Flask
from dotenv import load_dotenv
from flask_cors import CORS

from app.routes.admin import admin_bp
from app.routes.auth import auth_bp
from app.routes.booking import booking_bp
from app.routes.movies import movies_bp
from app.routes.profile import profile_bp
from app.routes.history_ai import history_ai_bp

def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me")
    CORS(
        app,
        resources={r"/*": {"origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]}},
        supports_credentials=True
    )
    app.register_blueprint(movies_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(booking_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api")
    app.register_blueprint(history_ai_bp, url_prefix="/api")
    return app