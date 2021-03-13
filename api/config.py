from json import loads
from typing import Any, Dict, List

field_type_mapping: Dict[str, 'FieldType'] = {}


class Config:
    """ Main config class

    Should be init using a JSON file
    """
    def __init__(self, filename: str) -> None:
        with open(filename, 'rb') as config_file:
            config = loads(config_file.read())
        self.fields: List['Field'] = [Field.load_from_dict(field_name, params) for field_name, params in config.items()]

    def check(self, value: dict) -> bool:
        return all(field.check(value.get(field.name)) for field in self.fields)


class Field:
    """
    """
    def __init__(
        self,
        name: str,
        field_type: 'FieldType',
        display_name: str='',
        required: bool=False,
        additional_params: dict={}
    ) -> None:
        self.name = name
        self.display_name = display_name
        self.field_type = field_type
        self.required = required
        self.additional_params = additional_params

    @staticmethod
    def load_from_dict(name: str, params: dict) -> 'Field':
        return Field(
            name,
            field_type_mapping[params['type']],
            display_name=params.get('display_name', ''),
            required=params.get('required', False),
            additional_params=params.get('additional_params', {}),
        )

    def check(self, value: Any) -> bool:
        """
        """
        if self.required:
            return self.field_type.check(value, additional_params=self.additional_params)
        if value:
            return self.field_type.check(value, additional_params=self.additional_params)
        return True


class FieldType:
    """Class used to represent a field type. Shouldn't be used, but rather subclassed
    """
    def check(self, value: Any, additional_params: dict={}) -> bool:
        """
        """
        raise NotImplementedError

    def _check_additional_params(self, value: Any, additional_params: dict={}) -> bool:
        """
        """
        raise NotImplementedError
