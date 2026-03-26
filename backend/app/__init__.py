import os

from flask import Flask
from dotenv import load_dotenv

from app.routes.auth import auth_bp
from app.routes.movies import movies_bp

def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me")
    app.register_blueprint(movies_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    return app