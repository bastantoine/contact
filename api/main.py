import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from views import api

def create_app() -> Flask:
    from models import db

    basedir = os.path.abspath(os.path.dirname(__file__))
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    CORS(app)

    db.init_app(app)
    with app.app_context():
        db.create_all()

    load_dotenv()
    # Make sure the config file exists when starting the app. If not create a blank file
    if not os.path.isfile(os.environ.get('CONFIG_FILE', 'config.json')):
        open(os.environ.get('CONFIG_FILE', 'config.json'), 'w').close()

    app.register_blueprint(api)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(port=int(os.environ.get('FLASK_PORT', 5000)))
