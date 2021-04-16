from json import loads
import os

from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from sqlalchemy.orm import Mapper
from sqlalchemy.engine import Connection

from config import (
    Config,
    FILE_FIELDS,
)

# Load .env file in the env variables
load_dotenv()

db = SQLAlchemy()

class Contact(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    infos = db.Column(db.String())
    inserted_timestamp = db.Column(db.DateTime())

    def format_infos(self):
        infos = loads(self.infos)
        infos['id'] = self.id
        return infos

@event.listens_for(Contact, 'after_delete')
def clean_files_on_delete(_mapper: Mapper, _connection: Connection, target: Contact):
    config = Config(os.environ.get('CONFIG_FILE', 'config.json'))
    file_fields = [field.name for field in config.fields if field.field_type in FILE_FIELDS]
    infos = loads(target.infos)
    for field in file_fields:
        if infos.get(field):
            os.remove(os.path.join(os.environ.get('UPLOAD_FOLDER', 'uploads'), infos[field]))
