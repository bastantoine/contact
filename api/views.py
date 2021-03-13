from flask import (
    Blueprint,
    jsonify,
)

api = Blueprint('api', __name__, url_prefix="")

from models import Contact

@api.route('/contact')
def contacts_get():
    return jsonify([contact.format_infos() for contact in Contact.query.all()])
