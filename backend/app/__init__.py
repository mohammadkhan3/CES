from flask import Flask
from dotenv import load_dotenv
from app.routes.movies import movies_bp

def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.register_blueprint(movies_bp, url_prefix="/api")
    return app