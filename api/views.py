from datetime import datetime
from json import dumps

from flask import (
    abort,
    Blueprint,
    jsonify,
    request,
    Response,
)

api = Blueprint('api', __name__, url_prefix="")

from models import (
    Contact,
    db,
)

@api.route('/contact', methods=['GET', 'POST'])
def contacts_get_post():
    if request.method == 'GET':
        return jsonify([contact.format_infos() for contact in Contact.query.all()])

    if not request.json:
        abort(Response(400, 'Missing data'))

    # It might sounds stupid to dump request.json which is the JSON parsed version of the body, but
    # internally request.json calls request.get_json() which does more than simply loading the
    # request body as JSON. It also checks that the Content-Type header is set to application/json
    # and that the request body is a valid JSON. So this way we are sure that the data we insert in
    # the DB is a valid JSON.
    new_contact = Contact(infos=dumps(request.json), inserted_timestamp=datetime.now())
    db.session.add(new_contact)
    db.session.commit()

    db.session.refresh(new_contact)
    return jsonify(new_contact.format_infos())
