import json
import os
from tempfile import NamedTemporaryFile
import unittest
from uuid import uuid4
import warnings

from flask_testing import TestCase
from sqlalchemy.exc import SAWarning

from config import (
    InvalidConfigException,
    validate_config,
    validate_config_file
)
from main import create_app
from models import db
from views import create_or_update_contact_instance_or_abort


def with_config(config, working_dir=None):
    def decorated(func):
        def wrapper(*args, **kwargs):
            with NamedTemporaryFile(mode='w+', dir=working_dir, suffix=".json") as temp_config:
                temp_config.write(json.dumps(config))
                temp_config.flush()
                # Save the current value of CONFIG_FILE for the env to be able to restore it later.
                old_config_path = os.getenv('CONFIG_FILE')
                # Make sure we provide a relative path, even if the file is in the cwd, otherwise
                # werkzeug wont be able to process it.
                os.environ['CONFIG_FILE'] = os.path.relpath(temp_config.name)
                resp = func(*args, **kwargs)
                if old_config_path:
                    # Restore CONFIG_FILE to its old value
                    os.environ['CONFIG_FILE'] = old_config_path
                return resp
        return wrapper
    return decorated

def with_instances(*instances, ignore_deleted_on_delete=False):
    def decorated(func):
        def wrapper(*args, **kwargs):
            created_instances = []
            # Create all the instances provided
            for instance in instances:
                created_instances.append(create_or_update_contact_instance_or_abort(None, instance))

            # Filter the provided args to make sure we provide TestCase instance ('self') to the
            # test as the first arg.
            test_case_instance = None
            filtered_args = []
            for arg in args:
                if isinstance(arg, BaseTestCase):
                    test_case_instance = arg
                else:
                    filtered_args.append(arg)

            resp = func(test_case_instance, created_instances, *filtered_args, **kwargs)

            with warnings.catch_warnings():
                if ignore_deleted_on_delete:
                    # When we try to delete an instance that has already been deleted before, we'll
                    # get a warning "SAWarning: DELETE statement on table 'contact' expected to
                    # delete xx row(s); yy were matched.  Please set confirm_deleted_rows=False
                    # within the mapper configuration to prevent this warning.". We can't
                    # dynamically set confirm_deleted_rows=False, so it's easier to simply ignore
                    # the warning when needed.
                    warnings.simplefilter('ignore', category=SAWarning)
                for instance in created_instances:
                    db.session.delete(instance)
                db.session.commit()
            return resp
        return wrapper
    return decorated


class BaseTestCase(TestCase):

    old_config_path = ""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)

    def create_app(self):
        app = create_app()
        app.config['TESTING'] = True
        return app

    def setUp(self):
        db.create_all()
        self.old_config_path = os.getenv('CONFIG_FILE')
        if os.getenv('CONFIG_FILE'):
            # Delete the old value only if needed
            del os.environ['CONFIG_FILE']

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        if self.old_config_path:
            # Restore the old value only if needed
            os.environ['CONFIG_FILE'] = self.old_config_path


class ModelTest(BaseTestCase):

    @with_config({"photo": {"type": "image", "additional_type_parameters": {"accepted_types": ["png"]}}})
    def test_delete_files_on_model_delete(self):
        imagename = f'myimage-{str(uuid4()).split("-")[0]}.png'
        imagepath = os.path.join(os.environ.get('UPLOAD_FOLDER', 'uploads'), imagename)
        instance = {
            "photo": imagename
        }
        with open(imagepath, 'w'):
            model_instance = create_or_update_contact_instance_or_abort(None, instance)
            self.assertTrue(os.path.isfile(imagepath))

            db.session.delete(model_instance)
            db.session.commit()
            self.assertFalse(os.path.isfile(imagepath))


class ApiTest(BaseTestCase):

    @with_config({"firstname": {"type": "str"}, "lastname": {"type": "str"}})
    @with_instances(
        {"firstname": "Anakin", "lastname": "Skywalker"},
        {"firstname": "Padme", "lastname": "Amidala"},
    )
    def test_contact_get(self, _):
        resp = self.client.get('/contact')
        self.assert200(resp)
        self.assertEqual(resp.content_type, 'application/json')
        expected = [
            {"id": 1, "firstname": "Anakin", "lastname": "Skywalker"},
            {"id": 2, "firstname": "Padme", "lastname": "Amidala"}
        ]
        self.assertEqual(resp.json, expected)

    @with_config({"firstname": {"type": "str"}, "lastname": {"type": "str"}})
    def test_contact_post(self):
        resp = self.client.post('/contact', json={"firstname": "Luke", "lastname": "Skywalker"})
        self.assert200(resp)
        self.assertEqual(resp.content_type, 'application/json')
        expected = {"id": 1, "firstname": "Luke", "lastname": "Skywalker"}
        self.assertEqual(resp.json, expected)

    @with_config({"firstname": {"type": "str"}, "lastname": {"type": "str"}})
    @with_instances({"firstname": "Ben", "lastname": "Solo"})
    def test_contact_id_put(self, _):
        resp = self.client.put('/contact/1', json={"firstname": "Kylo", "lastname": "Ren"})
        self.assert200(resp)
        self.assertEqual(resp.content_type, 'application/json')
        expected = {"id": 1, "firstname": "Kylo", "lastname": "Ren"}
        self.assertEqual(resp.json, expected)

    @with_config({"firstname": {"type": "str"}, "lastname": {"type": "str"}})
    @with_instances({"firstname": "Ben", "lastname": "Solo"}, ignore_deleted_on_delete=True)
    def test_contact_id_delete(self, _):
        resp = self.client.delete('/contact/1')
        self.assert200(resp)
        self.assertEqual(resp.data, b'')

    # This test will trigger a "ResourceWarning: unclosed file" warning, because it looks like Flask
    # never closes the file when sending it from directory (see flask.helpers:send_file). This
    # function was moved to Werkzeug in Flask 2.0.0, so perhaps it'll be fixed then. To be checked
    # later.
    @with_config({"id": {"type": "str", "primary_key": True, "required": True}, "firstname": {"type": "str"}}, working_dir=".")
    def test_config_get(self):
        resp = self.client.get('/config')
        self.assert200(resp)
        self.assertEqual(resp.content_type, 'application/json')
        expected = {"id": {"type": "str", "primary_key": True, "required": True}, "firstname": {"type": "str"}}
        self.assertEqual(resp.json, expected)

        resp = self.client.put('/config', json=dict(**expected, lastname={"type": "str"}))
        self.assert200(resp)


class ConfigTest(unittest.TestCase):

    def test_validate_config_file(self):
        with NamedTemporaryFile(mode='w+', suffix=".json") as temp_config:
            # Invalid file
            wrong_filename = ('.'.join(temp_config.name.split('.')[:-1]) +
                             str(uuid4()).split('-')[0] + # Add uuid to make sure the file doesn't exists
                             '.json')
            status, msg = validate_config_file(wrong_filename)
            self.assertFalse(status)
            self.assertEqual(msg, f'Invalid file with filename {wrong_filename}')

            # Invalid JSON
            temp_config.write('a')
            temp_config.flush()
            status, msg = validate_config_file(temp_config.name)
            self.assertFalse(status)
            self.assertEqual(msg, 'File is not a valid JSON')

            # Invalid config
            temp_config.seek(0)
            temp_config.write(json.dumps({"firstname": {"type": "str"}, "lastname": {"type": "str"}}))
            temp_config.flush()
            status, msg = validate_config_file(temp_config.name)
            self.assertFalse(status)
            self.assertEqual(msg, 'No parameter marked as "primary_key" found')

            # Valid config
            temp_config.seek(0)
            temp_config.write(json.dumps({
                "id": {"type": "integer", "primary_key": True, "required": True},
                "firstname": {"type": "str"}
            }))
            temp_config.flush()
            status, msg = validate_config_file(temp_config.name)
            self.assertTrue(status)
            self.assertEqual(msg, 'Valid config file!')

    def test_valid_config(self):
        params = [
            # primary key related configs
            {
                'name': 'No primary key',
                'config': {
                    "name": {},
                },
                'exception_params': {
                    'field': '',
                    'param': 'primary_key',
                    'msg': 'No parameter marked as "primary_key" found',
                }
            },
            {
                'name': 'More than one primary key found',
                'config': {
                    "id": {"primary_key": True},
                    "id2": {"primary_key": True},
                },
                'exception_params': {
                    'field': ['id', 'id2'],
                    'param': 'primary_key',
                    'msg': 'Found 2 parameters marked as "primary_key": id, id2',
                }
            },
            {
                'name': 'Primary key was not marked as required',
                'config': {
                    "id": {"primary_key": True},
                },
                'exception_params': {
                    'field': 'id',
                    'param': 'required',
                    'msg': 'Parameter marked as primary_key must also be marked as "required"',
                }
            },

            {
                'name': '"type" parameter is required',
                'config': {
                    "id": {"primary_key": True, "required": True},
                },
                'exception_params': {
                    'field': 'id',
                    'param': 'type',
                    'msg': 'Invalid value of parameter "type" for field "id": None',
                }
            },

            # Config params specifics to "type": "list"
            {
                'name': '"additional_type_parameters" parameter is required with "type": "list"',
                'config': {
                    "param": {"type": "list"}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'additional_type_parameters',
                    'msg': 'Missing parameter "additional_type_parameters" from field "param" of "type": "list"',
                }
            },
            {
                'name': '"additional_type_parameters" parameter must be a dict "type": "list"',
                'config': {
                    "param": {"type": "list", "additional_type_parameters": []}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'additional_type_parameters',
                    'msg': 'Invalid value of parameter "additional_type_parameters" for field "param": []',
                }
            },
            {
                'name': 'Cannot have "inner_type": "list" with "type": "list"',
                'config': {
                    "param": {"type": "list", "additional_type_parameters": {
                        "inner_type": "list"
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'inner_type',
                    'msg': 'Found parameter param of "type": "list" with "inner_type": "list"',
                }
            },

            # Config params specifics to "type": "select"
            {
                'name': '"additional_type_parameters" parameter is required with "type": "select"',
                'config': {
                    "param": {"type": "select"},
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'additional_type_parameters',
                    'msg': 'Missing parameter "additional_type_parameters" from field "param" of "type": "select"',
                }
            },
            {
                'name': '"additional_type_parameters" parameter must be a dict "type": "select"',
                'config': {
                    "param": {"type": "select", "additional_type_parameters": []}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'additional_type_parameters',
                    'msg': 'Invalid value of parameter "additional_type_parameters" for field "param": []',
                }
            },
            {
                'name': '"allowed_values" param must be a list with "type": "select"',
                'config': {
                    "param": {"type": "select", "additional_type_parameters": {
                        "allowed_values": "a"
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'allowed_values',
                    'msg': 'Invalid value of parameter "allowed_values" for field "param": a',
                }
            },
            {
                'name': 'All values of "allowed_values" param must be strings with "type": "select"',
                'config': {
                    "param": {"type": "select", "additional_type_parameters": {
                        "allowed_values": ["a", 1]
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'allowed_values',
                    'msg': "Invalid value of parameter \"allowed_values\" for field \"param\": ['a', 1]",
                }
            },

            # Config params specifics to "type": "image"
            {
                'name': '"additional_type_parameters" parameter must be a dict if provided with "type": "image"',
                'config': {
                    "param": {"type": "image", "additional_type_parameters": []}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'additional_type_parameters',
                    'msg': 'Invalid value of parameter "additional_type_parameters" for field "param": []',
                }
            },
            {
                'name': '"accepted_types" param must be provided with "type": "image"',
                'config': {
                    "param": {"type": "image", "additional_type_parameters": {}}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'accepted_types',
                    'msg': 'Missing parameter "accepted_types" from field "param" of "type": "list"',
                }
            },
            {
                'name': '"accepted_types" param must be a list with "type": "image"',
                'config': {
                    "param": {"type": "image", "additional_type_parameters": {
                        "accepted_types": "a"
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'accepted_types',
                    'msg': "Invalid value of parameter \"accepted_types\" for field \"param\": a",
                }
            },
            {
                'name': '"accepted_types" param cannot be an empty list with "type": "image"',
                'config': {
                    "param": {"type": "image", "additional_type_parameters": {
                        "accepted_types": []
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'accepted_types',
                    'msg': "Invalid value of parameter \"accepted_types\" for field \"param\": []",
                }
            },
            {
                'name': '"accepted_types" param must be a list of only strings with "type": "image"',
                'config': {
                    "param": {"type": "image", "additional_type_parameters": {
                        "accepted_types": ["a", 1]
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'accepted_types',
                    'msg': "Invalid value of parameter \"accepted_types\" for field \"param\": ['a', 1]",
                }
            },

            # Config params specifics to "type": "toggle"
            {
                'name': '"additional_type_parameters" parameter must be a dict if provided with "type": "toggle"',
                'config': {
                    "param": {"type": "toggle", "additional_type_parameters": []}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'additional_type_parameters',
                    'msg': 'Invalid value of parameter "additional_type_parameters" for field "param": []',
                }
            },
            {
                'name': '"additional_type_parameters" param cannot be empty with "type": "toggle"',
                'config': {
                    "param": {"type": "toggle", "additional_type_parameters": {}}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': ['value_true', 'value_false'],
                    'msg': 'Missing parameter "[\'value_true\', \'value_false\']" from field "param" of "type": "toggle"',
                }
            },
            {
                'name': '"value_true" param must be a str with "type": "toggle"',
                'config': {
                    "param": {"type": "toggle", "additional_type_parameters": {
                        "value_true": 1
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'value_true',
                    'msg': "Invalid value of parameter \"value_true\" for field \"param\": 1",
                }
            },
            {
                'name': '"value_false" param must be a str with "type": "toggle"',
                'config': {
                    "param": {"type": "toggle", "additional_type_parameters": {
                        "value_true": "yes", "value_false": 1
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'value_false',
                    'msg': "Invalid value of parameter \"value_false\" for field \"param\": 1",
                }
            },
            {
                'name': 'Must have both "value_true" and "value_false" at the same time with "type": "toggle"',
                'config': {
                    "param": {"type": "toggle", "additional_type_parameters": {
                        "value_true": ''
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'value_false',
                    'msg': "Invalid value of parameter \"value_false\" for field \"param\": None",
                }
            },
            {
                'name': 'Must have both "value_true" and "value_false" at the same time with "type": "toggle"',
                'config': {
                    "param": {"type": "toggle", "additional_type_parameters": {
                        "value_false": ''
                    }}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'value_true',
                    'msg': "Invalid value of parameter \"value_true\" for field \"param\": None",
                }
            },

            {
                'name': 'If provided, "display_name" must be a str',
                'config': {
                    "param": {"type": "str", "display_name": 1}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'display_name',
                    'msg': "Invalid value of parameter \"display_name\" for field \"param\": 1",
                }
            },
            {
                'name': 'If provided, "form_help_text" must be a str',
                'config': {
                    "param": {"type": "str", "form_help_text": 1}
                },
                'with_pk': True,
                'exception_params': {
                    'field': 'param',
                    'param': 'form_help_text',
                    'msg': "Invalid value of parameter \"form_help_text\" for field \"param\": 1",
                }
            },
            {
                'name': 'Cannot have two params with the same "sort_key" value',
                'config': {
                    "param1": {"type": "str", "sort_key": 1},
                    "param2": {"type": "str", "sort_key": 1},
                },
                'with_pk': True,
                'exception_params': {
                    'field': ['param1', 'param2'],
                    'param': 'sort_key',
                    'msg': 'Found 2 parameters with "sort_key": "1"',
                }
            },
            {
                'name': 'Cannot have two params with the same "main_attribute" value',
                'config': {
                    "param1": {"type": "str", "main_attribute": 1},
                    "param2": {"type": "str", "main_attribute": 1},
                },
                'with_pk': True,
                'exception_params': {
                    'field': ['param1', 'param2'],
                    'param': 'main_attribute',
                    'msg': 'Found 2 parameters with "main_attribute": "1"',
                }
            },
        ]
        for param in params:
            with self.subTest(msg=param['name']):
                config = param['config']
                if param.get('with_pk', False):
                    # Include a primary key field if told so. This way we don't have to include it
                    # manually each time we are testing something not related to the primary key
                    # config (like almost all the time).
                    config.update({
                        str(uuid4()).split('-')[0]: {"primary_key": True, "required": True, "type": "integer"}
                    })
                try:
                    validate_config(config)
                except InvalidConfigException as got:
                    if type(got.field) == list:
                        self.assertCountEqual(got.field, param['exception_params']['field'])
                    else:
                        self.assertEqual(got.field, param['exception_params']['field'])
                    if type(got.param) == list:
                        self.assertCountEqual(got.param, param['exception_params']['param'])
                    else:
                        self.assertEqual(got.param, param['exception_params']['param'])
                    self.assertEqual(got.message, param['exception_params']['msg'])


if __name__ == '__main__':
    unittest.main()
