import json
import os
from tempfile import NamedTemporaryFile
import unittest
from uuid import uuid4

from flask_testing import TestCase

from main import create_app
from models import db
from views import create_or_update_contact_instance_or_abort


def with_config(config):
    def decorated(func):
        def wrapper(*args, **kwargs):
            with NamedTemporaryFile(mode='w+') as temp_config:
                temp_config.write(json.dumps(config))
                temp_config.flush()
                os.environ['CONFIG_FILE'] = temp_config.name
                return func(*args, **kwargs)
        return wrapper
    return decorated

def with_instances(*instances):
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
            for instance in created_instances:
                db.session.delete(instance)
            db.session.commit()
            return resp
        return wrapper
    return decorated


class BaseTestCase(TestCase):

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)

    def create_app(self):
        app = create_app()
        app.config['TESTING'] = True
        return app

    def setUp(self):
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()


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


if __name__ == '__main__':
    unittest.main()
