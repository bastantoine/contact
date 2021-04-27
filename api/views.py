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
from werkzeug.utils import secure_filename

# Load .env file in the env variables
load_dotenv()

api = Blueprint('api', __name__, url_prefix="")

from config import (
    Config,
    FILE_FIELDS,
    InvalidConfigException,
    MissingRequiredValueException,
    validate_config,
    WrongTypeException,
)
from models import (
    Contact,
    db,
)

@api.route('/contact', methods=['GET', 'POST'])
def contacts_get_post():
    if request.method == 'GET':
        return jsonify([add_full_url_to_file_fields(contact.format_infos(), request.url_root) for contact in Contact.query.all()])

    if not request.json:
        abort(400, 'Missing data')

    # We're safe to use request.json, because we already checked before, when calling request.json,
    # that the body of the request was indeed a valid JSON. Internally request.json calls
    # request.get_json() which does more than simply loading the request body as JSON. It also
    # checks that the Content-Type header is set to application/json and that the request body is a
    # valid JSON. This way we are sure the data we insert in the DB is a valid JSON.
    new_contact = create_or_update_contact_instance_or_abort(None, request.json)
    return jsonify(add_full_url_to_file_fields(new_contact.format_infos(), request.url_root))

@api.route('/contact/<int:id_contact>', methods=['DELETE', 'PUT'])
def contacts_delete_put(id_contact: int):
    contact = Contact.query.get_or_404(id_contact)

    if request.method == 'DELETE':
        db.session.delete(contact)
        db.session.commit()
        return ('', 200)

    if not request.json:
        abort(400, 'Missing data')

    contact = create_or_update_contact_instance_or_abort(contact, request.json)
    return jsonify(add_full_url_to_file_fields(contact.format_infos(), request.url_root))

@api.route('/contact/<int:id_contact>/files', methods=['POST', 'PUT'])
def contacts_file_post_put(id_contact: int):
    contact = Contact.query.get_or_404(id_contact)

    if not request.files:
        abort(400)

    config = Config(os.environ.get('CONFIG_FILE', 'config.json'))
    file_fields = [field for field in config.fields if field.field_type in FILE_FIELDS]

    new_infos = {}
    for field in file_fields:
        if field.required and not request.files.get(field.name):
            abort(_build_response_config_error(MissingRequiredValueException(field.name)))
        if request.files.get(field.name):
            file = request.files.get(field.name)
            if not file.filename:
                abort(400, f'Missing filename for field {field.name}')
            filename = secure_filename(file.filename)
            file.save(os.path.join(os.environ.get('UPLOAD_FOLDER'), filename))
            new_infos[field.name] = filename

    contact = create_or_update_contact_instance_or_abort(contact, new_infos)
    return jsonify(add_full_url_to_file_fields(contact.format_infos(), request.url_root))

@api.route('/config', methods=['GET', 'PUT'])
def config_get():
    if request.method == 'GET':
        return send_from_directory('.', os.environ.get('CONFIG_FILE', 'config.json'))

    if not request.json:
        abort(400, 'Missing data')

    try:
        validate_config(request.json)
    except InvalidConfigException as ex:
        response = jsonify({
            "field": ex.field,
            "param": ex.param,
            "message": ex.message,
        })
        response.status = '400'
        abort(response)

    with open(os.environ.get('CONFIG_FILE', 'config.json'), 'w') as file:
        file.write(dumps(request.json, indent=4))

    return Response(status=200)

@api.route('/<filename>')
def filename_get(filename: str):
    return send_from_directory(os.environ.get('UPLOAD_FOLDER', 'uploads'), filename)

def create_or_update_contact_instance_or_abort(instance: Contact, new_infos: dict) -> Contact:
    if not new_infos:
        return instance

    config = Config(os.environ.get('CONFIG_FILE', 'config.json'))
    try:
        config.check(new_infos, fields_to_skip=['id'])
    except (MissingRequiredValueException, WrongTypeException) as exp:
        abort(_build_response_config_error(exp))

    # In case the initial instance is None, this means we want to create a new instance
    is_add = bool(instance is None)
    instance = instance or Contact(infos= '{}', inserted_timestamp=datetime.now())
    current_infos = loads(instance.infos)
    instance.infos = dumps(dict(current_infos, **new_infos))
    if is_add:
        db.session.add(instance)
    db.session.commit()
    db.session.refresh(instance)
    return instance

def add_full_url_to_file_fields(infos: dict, base_url: str) -> dict:
    config = Config(os.environ.get('CONFIG_FILE', 'config.json'))
    file_fields = [field.name for field in config.fields if field.field_type in FILE_FIELDS]
    for field in file_fields:
        if infos.get(field):
            infos[field] = os.path.join(base_url, infos[field])
    return infos

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
