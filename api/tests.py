import json
import os
from tempfile import NamedTemporaryFile
import unittest
from uuid import uuid4
import warnings

from flask_testing import TestCase
from sqlalchemy.exc import SAWarning

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


if __name__ == '__main__':
    unittest.main()
