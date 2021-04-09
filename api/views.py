from datetime import datetime
from json import (dumps, loads)
import os
from typing import Union

from dotenv import load_dotenv
from flask import (
    abort,
    Blueprint,
    jsonify,
    request,
    Response,
    send_from_directory,
)

# Load .env file in the env variables
load_dotenv()

api = Blueprint('api', __name__, url_prefix="")

from config import (
    Config,
    MissingRequiredValueException,
    WrongTypeException,
)
from models import (
    Contact,
    db,
)

@api.route('/contact', methods=['GET', 'POST'])
def contacts_get_post():
    if request.method == 'GET':
        return jsonify([contact.format_infos() for contact in Contact.query.all()])

    if not request.json:
        abort(400, 'Missing data')

    infos = request.json

    config = Config(os.environ.get('CONFIG_FILE', 'config.json'))
    try:
        config.check(infos, fields_to_skip=['id'])
    except (MissingRequiredValueException, WrongTypeException) as exp:
        abort(_build_response_config_error(exp))

    # We're safe to use request.json, because we already checked before, when calling request.json,
    # that the body of the request was indeed a valid JSON. Internally request.json calls
    # request.get_json() which does more than simply loading the request body as JSON. It also
    # checks that the Content-Type header is set to application/json and that the request body is a
    # valid JSON. This way we are sure the data we insert in the DB is a valid JSON.
    new_contact = Contact(infos=dumps(infos), inserted_timestamp=datetime.now())
    db.session.add(new_contact)
    db.session.commit()

    db.session.refresh(new_contact)
    return jsonify(new_contact.format_infos())

@api.route('/contact/<int:id_contact>', methods=['DELETE', 'PUT'])
def contacts_delete_put(id_contact: int):
    contact = Contact.query.get_or_404(id_contact)

    if request.method == 'DELETE':
        db.session.delete(contact)
        db.session.commit()
        return ('', 200)

    if not request.json:
        abort(400, 'Missing data')

    new_infos = request.json
    config = Config(os.environ.get('CONFIG_FILE', 'config.json'))
    try:
        config.check(new_infos, fields_to_skip=['id'])
    except (MissingRequiredValueException, WrongTypeException) as exp:
        abort(_build_response_config_error(exp))

    current_infos = loads(contact.infos)
    contact.infos = dumps(dict(current_infos, **new_infos))
    db.session.commit()
    db.session.refresh(contact)
    return jsonify(contact.format_infos())

@api.route('/config')
def config_get():
    return send_from_directory('.', os.environ.get('CONFIG_FILE', 'config.json'))

def _build_response_config_error(error: Union[MissingRequiredValueException, WrongTypeException]) -> Response:
    body = {
        "field": error.field,
        "code": error.code,
    }
    if isinstance(error, WrongTypeException):
        body["expected_type"] = error.expect_type
    response = jsonify(body)
    response.status = '400'
    return response
