import os

from flask import Flask

def create_app() -> Flask:
    basedir = os.path.abspath(os.path.dirname(__file__))
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(port=int(os.environ.get('FLASK_PORT', 5000)))
