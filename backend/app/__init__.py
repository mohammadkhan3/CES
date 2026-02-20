from flask import Flask
from app.routes.movies import movies_bp

def create_app():
    app = Flask(__name__)
    app.register_blueprint(movies_bp, url_prefix="/api")
    return app
