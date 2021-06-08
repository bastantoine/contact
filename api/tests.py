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


class ModelTest(TestCase):

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.TESTDB_NAME = f'test-{str(uuid4()).split("-")[0]}.db'

    def create_app(self):
        app = create_app()
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{self.TESTDB_NAME}'
        return app

    def setUp(self):
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        os.remove(self.TESTDB_NAME)

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

if __name__ == '__main__':
    unittest.main()
