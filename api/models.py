from json import loads

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Contact(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    infos = db.Column(db.String())
    inserted_timestamp = db.Column(db.DateTime())

    def format_infos(self):
        infos = loads(self.infos)
        infos['id'] = self.id
        return infos
