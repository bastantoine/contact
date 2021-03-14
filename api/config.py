from json import loads
from typing import Any, Dict, List


class MissingRequiredValueException(Exception):
    pass

class WrongTypeException(Exception):
    pass


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
            FIELD_TYPE_MAPPING[params['type']],
            display_name=params.get('display_name', ''),
            required=params.get('required', False),
            additional_params=params.get('additional_params', {}),
        )

    def check(self, value: Any) -> bool:
        """
        """
        if self.required:
            if not value:
                raise MissingRequiredValueException(f'Missing value for required parameter {self.name}')
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

    def _raise_wrong_type_error(self, value):
        raise WrongTypeException(f"Wrong type for {self.__class__.__name__} with value {value} ({type(value).__name__})")


class IntegerFieldType(FieldType):
    """Check the value is an integer
    """
    def check(self, value: Any, additional_params: dict={}) -> bool:
        if not isinstance(value, int):
            self._raise_wrong_type_error(value)
        return True


class StrFieldType(FieldType):
    """Check the value is a str
    """
    def check(self, value: Any, additional_params: dict={}) -> bool:
        if not isinstance(value, str):
            self._raise_wrong_type_error(value)
        return True


class ListFieldType(FieldType):
    """Check the value is a list.

    If `additional_params` contains a `inner_type` as a valid type of `FIELD_TYPE_MAPPING`, will
    check also the values of the list against the `inner_type` type checker

    >>> from config import FIELD_TYPE_MAPPING
    >>> checker = FIELD_TYPE_MAPPING['list']
    >>> checker
    <config.ListFieldType object at 0x104b81d90>
    >>> checker.check([1, 2, 3], {'inner_type': 'integer'})
    True
    """
    def check(self, value: Any, additional_params: dict={}) -> bool:
        if not isinstance(value, list):
            self._raise_wrong_type_error(value)
        return self._check_additional_params(value, additional_params)

    def _check_additional_params(self, value: Any, additional_params: dict) -> bool:
        inner_type = additional_params.get('inner_type')
        if not inner_type:
            return True
        field_type = FIELD_TYPE_MAPPING[inner_type]
        return all(field_type.check(val, additional_params) for val in value)


class ImageFieldType(FieldType):
    """Check the value is a image, so a str and a path to a file (ie. with at least a dot in it).

    If `additional_params` contains `accepted_types` as a list of str, the extension will be checked
    against the values passed.

    >>> from config import FIELD_TYPE_MAPPING
    >>> checker = FIELD_TYPE_MAPPING['image']
    >>> checker
    <config.ImageFieldType object at 0x10206ed60>
    >>> checker.check('path/to/file.png', {'accepted_types': ['png', 'jpg']})
    True
    """
    def check(self, value: Any, additional_params: dict={}) -> bool:
        if not isinstance(value, str):
            self._raise_wrong_type_error(value)
        return value.find('.') != -1 and self._check_additional_params(value, additional_params)

    def _check_additional_params(self, value: Any, additional_params: dict) -> bool:
        accepted_types = additional_params.get('accepted_types')
        if not accepted_types:
            return True
        extension = value.split('.')[-1].lower()
        return extension in [ext.lower() for ext in accepted_types]


# Mapping of the accepted values and their type checker
FIELD_TYPE_MAPPING: Dict[str, 'FieldType'] = {
    'integer': IntegerFieldType(),
    'str': StrFieldType(),
    'list': ListFieldType(),
    'image': ImageFieldType(),

    # Same as type checker as str, but different type
    # names to provide different displays in the front
    'long_str': StrFieldType(),
    'url': StrFieldType(),
    'email': StrFieldType(),
}
