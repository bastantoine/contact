import argparse
from json import loads, JSONDecodeError
from typing import Any, Dict, List, Tuple, Union
import os
import sys


class MissingRequiredValueException(Exception):

    def __init__(self, field: str, *args: object) -> None:
        self.code = 'MISSING_VALUE_REQUIRED'
        self.field = field
        super().__init__(*args)

class WrongTypeException(Exception):

    def __init__(self, field: str, expect_type: str, *args: object) -> None:
        self.code = 'WRONG_TYPE'
        self.field = field
        self.expect_type = expect_type
        super().__init__(*args)


class InvalidConfigException(Exception):

    def __init__(self, field: Union[str, list], param: Union[str, list], pattern: str, *args: object, **pattern_params: dict) -> None:
        self.field = field
        self.param = param
        self.message = pattern.format(field=field, param=param, **pattern_params)
        super().__init__(*args)


class Config:
    """ Main config class

    Should be init using a JSON file
    """
    def __init__(self, filename: str) -> None:
        with open(filename, 'rb') as config_file:
            config = loads(config_file.read())
        self.fields: List['Field'] = [Field.load_from_dict(field_name, params) for field_name, params in config.items()]

    def check(self, value: dict, fields_to_skip: list=[]) -> bool:
        return all(field.check(value.get(field.name)) for field in self.fields if field.name not in fields_to_skip)


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
        try:
            if self.required:
                if not value:
                    raise MissingRequiredValueException(self.name, f'Missing value for required parameter {self.name}')
                return self.field_type.check(value, additional_params=self.additional_params)
            if value:
                return self.field_type.check(value, additional_params=self.additional_params)
        except WrongTypeException as exp:
            # Set the real field name here, because we don't have it when checking the type
            exp.field = self.name
            raise exp
        return True


class FieldType:
    """Class used to represent a field type. Shouldn't be used, but rather subclassed
    """
    type_name: str
    def check(self, value: Any, additional_params: dict={}) -> bool:
        """
        """
        raise NotImplementedError

    def _check_additional_params(self, value: Any, additional_params: dict={}) -> bool:
        """
        """
        raise NotImplementedError

    def _raise_wrong_type_error(self, value):
        raise WrongTypeException(
            '', # Field name, set it to blank here because we don't have it, will be set to the right value later
            self.type_name or TYPE_FIELD_MAPPING[self.__class__],
            f"Wrong type for {self.__class__.__name__} with value {value} ({type(value).__name__})",
        )


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


class ToggleFieldType(FieldType):
    """Check the value is a boolean
    """
    # Change the type displayed, otherwise it'll say
    # 'Wrong type for <field name>, expected toggle'
    type_name = 'boolean'
    def check(self, value: Any, additional_params: dict={}) -> bool:
        if not isinstance(value, bool):
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
            return False
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
    'toggle': ToggleFieldType(),

    # Same as type checker as str, but different type
    # names to provide different displays in the front
    'long_str': StrFieldType(),
    'url': StrFieldType(),
    'email': StrFieldType(),
    'select': StrFieldType(),
}
TYPE_FIELD_MAPPING = {field.__class__: type_name for type_name, field in FIELD_TYPE_MAPPING.items()}
FILE_FIELDS = [
    FIELD_TYPE_MAPPING['image'],
]


def validate_config_file(filename: str) -> Tuple[bool, str]:
    # Filename given must points to a valid file
    if not os.path.isfile(filename):
        return (False, f'Invalid file with filename {filename}')

    # File must be a valid JSON file
    try:
        with open(filename) as f:
            # validate_config doesn't return anything, but
            # raises InvalidConfigException in case of error
            validate_config(loads(f.read()))
            return (True, 'Valid config file!')
    except JSONDecodeError:
        return (False, 'File is not a valid JSON')
    except InvalidConfigException as ex:
        return (False, ex.message)

def validate_config(config: dict):
    MISSING_PARAMETER_FROM_FIELD_TEMPLATE = 'Missing parameter "{param}" from field "{field}"'
    INVALID_VALUE_OF_PARAMETER = 'Invalid value of parameter "{param}" for field "{field}": {value}'

    # Config must have one and only one parameter marked as primary_key
    primary_key = {k: v for k, v in config.items() if v.get('primary_key')}
    if len(primary_key) == 0:
        raise InvalidConfigException('', 'primary_key', 'No parameter marked as "primary_key" found')
    if len(primary_key) > 1:
        raise InvalidConfigException(
            list(primary_key.keys()),
            'primary_key',
            f'Found {len(primary_key)} parameters marked as "primary_key": {", ".join(primary_key.keys())}'
        )

    primary_key_field_name = list(primary_key.keys())[0]
    primary_key = primary_key[primary_key_field_name]

    # This primary key must be marked as required
    if not primary_key.get('required') or primary_key.get('required') != True:
        raise InvalidConfigException(
            primary_key_field_name,
            'required',
            'Parameter marked as primary_key must also be marked as "required"'
        )

    def check_type(type_name: str, parameter_name: str, attribute_name: str) -> Tuple[bool, str]:
        if type_name is None:
            # Attribute is required
            raise InvalidConfigException(parameter_name, attribute_name, MISSING_PARAMETER_FROM_FIELD_TEMPLATE)
        if type_name not in FIELD_TYPE_MAPPING.keys():
            # Attribute value must be a valid one
            raise InvalidConfigException(parameter_name, attribute_name, INVALID_VALUE_OF_PARAMETER, value=type_name)

    def check_type_of_attributes(parameter_name: str, params: dict):
        MAPPING = {
            'type': str,
            'display_name': str,
            'form_help_text': str,
            'required': bool,
            'primary_key': bool,
            'main_attribute': int,
            'sort_key': int,
            'additional_type_parameters': dict,
        }
        for attribute, expected_type in MAPPING.items():
            if attribute == 'type':
                # 'type' attribute is required
                if not isinstance(params.get(attribute), expected_type):
                    raise InvalidConfigException(
                        parameter_name,
                        attribute,
                        INVALID_VALUE_OF_PARAMETER,
                        value=params.get(attribute)
                    )
            elif params.get(attribute) is not None:
                if not isinstance(params.get(attribute), expected_type):
                    raise InvalidConfigException(
                        parameter_name,
                        attribute,
                        INVALID_VALUE_OF_PARAMETER,
                        value=params.get(attribute)
                    )

    for parameter_name, params in config.items():
        # Make sure 'type' is there and with a valid value
        param_type = params.get('type')
        check_type_of_attributes(parameter_name, params)
        check_type(param_type, parameter_name, 'type')
        if param_type == 'list':
            # 'list' parameters must have a 'additional_type_parameters'
            # attribute as an JSON object (ie. a python dict)
            additional_params = params.get('additional_type_parameters')
            if additional_params is None:
                raise InvalidConfigException(
                    parameter_name,
                    'additional_type_parameters',
                    MISSING_PARAMETER_FROM_FIELD_TEMPLATE+' of "type": "list"'
                )
            if not isinstance(additional_params, dict):
                raise InvalidConfigException(
                    parameter_name,
                    'additional_type_parameters',
                    INVALID_VALUE_OF_PARAMETER,
                    value=additional_params
                )
            # Make sure 'inner_type' is there and with a valid value
            inner_param_type = additional_params.get('inner_type')
            check_type(inner_param_type, parameter_name, 'inner_type')
            if inner_param_type == 'list':
                # We cannot have a list of lists
                raise InvalidConfigException(
                    parameter_name,
                    'inner_type',
                    f'Found parameter {parameter_name} of "type": "list" with "inner_type": "list"'
                )

        if param_type == 'select':
            # 'list' parameters must have a 'additional_type_parameters'
            # attribute as an JSON object (ie. a python dict)
            additional_params = params.get('additional_type_parameters')
            if additional_params is None:
                raise InvalidConfigException(
                    parameter_name,
                    'additional_type_parameters',
                    MISSING_PARAMETER_FROM_FIELD_TEMPLATE+' of "type": "select"'
                )
            if not isinstance(additional_params, dict):
                raise InvalidConfigException(
                    parameter_name,
                    'additional_type_parameters',
                    INVALID_VALUE_OF_PARAMETER,
                    value=additional_params
                )
            # Make sure 'allowed_values' is there and with a valid value
            allowed_values = additional_params.get('allowed_values')
            if not isinstance(allowed_values, list):
                raise InvalidConfigException(
                    parameter_name,
                    'allowed_values',
                    INVALID_VALUE_OF_PARAMETER,
                    value=allowed_values
                )
            if any(not isinstance(value, str) for value in allowed_values):
                raise InvalidConfigException(
                    parameter_name,
                    'allowed_values',
                    INVALID_VALUE_OF_PARAMETER,
                    value=allowed_values
                )

        if param_type == 'image' and params.get('additional_type_parameters') is not None:
            # In case a field of type 'image' has a 'additional_type_parameters' attribute, check
            # it's a JSON object (ie. a python dict) and check its content
            additional_params = params.get('additional_type_parameters')
            if not isinstance(additional_params, dict):
                raise InvalidConfigException(
                    parameter_name,
                    'additional_type_parameters',
                    INVALID_VALUE_OF_PARAMETER,
                    value=additional_params
                )
            # If 'additional_type_parameters" is provided, make sure it's not empty
            accepted_types = additional_params.get('accepted_types')
            if accepted_types is None:
                raise InvalidConfigException(
                    parameter_name,
                    'accepted_types',
                    MISSING_PARAMETER_FROM_FIELD_TEMPLATE+' of "type": "list"'
                )
            if not isinstance(accepted_types, list):
                raise InvalidConfigException(
                    parameter_name,
                    'accepted_types',
                    INVALID_VALUE_OF_PARAMETER,
                    value=accepted_types
                )
            if len(accepted_types) == 0:
                raise InvalidConfigException(
                    parameter_name,
                    'accepted_types',
                    INVALID_VALUE_OF_PARAMETER,
                    value=accepted_types
                )
            for accepted_type in accepted_types:
                if not isinstance(accepted_type, str):
                    raise InvalidConfigException(
                        parameter_name,
                        'accepted_types',
                        INVALID_VALUE_OF_PARAMETER,
                        value=accepted_types
                    )

        if param_type == 'toggle' and params.get('additional_type_parameters') is not None:
            # In case a field of type 'toggle' has a 'additional_type_parameters' attribute, check
            # it's a JSON object (ie. a python dict) and check its content
            additional_params = params.get('additional_type_parameters')
            if not isinstance(additional_params, dict):
                raise InvalidConfigException(
                    parameter_name,
                    'additional_type_parameters',
                    INVALID_VALUE_OF_PARAMETER,
                    value=additional_params
                )
            # If 'additional_type_parameters" is provided, make sure it's not empty
            value_true = additional_params.get('value_true')
            value_false = additional_params.get('value_false')
            if value_true is None and value_false is None:
                raise InvalidConfigException(
                    parameter_name,
                    ['value_true', 'value_false'],
                    MISSING_PARAMETER_FROM_FIELD_TEMPLATE+' of "type": "toggle"'
                )
            for name, value in [('value_true', value_true), ('value_false', value_false)]:
                if not isinstance(value, str):
                    raise InvalidConfigException(
                        parameter_name,
                        name,
                        INVALID_VALUE_OF_PARAMETER,
                        value=value
                    )
            # Do not allow to have only one of them set to an empty string
            if (value_true == '' and value_false != '') or (value_true != '' and value_false == ''):
                raise InvalidConfigException(
                    parameter_name,
                    'value_true' if value_true == '' else value_false,
                    INVALID_VALUE_OF_PARAMETER,
                    value=value_true if value_true == '' else value_false
                )

    params_with_display_name = {k: v.get('display_name') for k, v in config.items() if v.get('display_name')}
    for parameter_name, display_name_value in params_with_display_name.items():
        if not isinstance(display_name_value, str):
            # 'display_name' when set must be a str
            raise InvalidConfigException(
                parameter_name,
                'display_name',
                INVALID_VALUE_OF_PARAMETER,
                value=display_name_value
            )

    params_with_form_help_text = {k: v.get('form_help_text') for k, v in config.items() if v.get('form_help_text')}
    for parameter_name, form_help_text_value in params_with_form_help_text.items():
        if not isinstance(form_help_text_value, str):
            # 'form_help_text' when set must be a str
            raise InvalidConfigException(
                parameter_name,
                'form_help_text',
                INVALID_VALUE_OF_PARAMETER,
                value=form_help_text_value
            )

    # TODO: Find a better solution to avoid looping over all the values multiple times
    params_with_sort_key = sorted(
        [(k, v.get('sort_key')) for k, v in config.items() if v.get('sort_key')],
        key= lambda v: v[1]
    )
    sort_key_values = [v for (_, v) in params_with_sort_key]
    for parameter_name, sort_key_value in params_with_sort_key:
        if sort_key_values.count(sort_key_value) > 1:
            # More than one parameter with the same 'sort_key' value
            params_with_same_sort_key = [field_name for field_name, value in params_with_sort_key if value == sort_key_value]
            raise InvalidConfigException(
                list(params_with_same_sort_key),
                'sort_key',
                f'Found {len(params_with_same_sort_key)} parameters with "sort_key": "{sort_key_value}"'
            )

    # TODO: Find a better solution to avoid looping over all the values multiple times
    params_with_main_attribute = sorted(
        [(k, v.get('main_attribute')) for k, v in config.items() if v.get('main_attribute')],
        key= lambda v: v[1]
    )
    main_attribute_values = [v for (_, v) in params_with_main_attribute]
    for parameter_name, main_attribute_value in params_with_main_attribute:
        if main_attribute_values.count(main_attribute_value) > 1:
            # More than one parameter with the same 'main_attribute' value
            params_with_same_main_attribute = [field_name for field_name, value in params_with_main_attribute if value == main_attribute_value]
            raise InvalidConfigException(
                list(params_with_same_main_attribute),
                'main_attribute',
                f'Found {len(params_with_same_main_attribute)} parameters with "main_attribute": "{main_attribute_value}"'
            )

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "filename",
        help="Absolute or relative path to the .json config file to check",
    )
    args = parser.parse_args()
    check, message = validate_config_file(args.filename)
    print(message)
    # 'not check' so that True means we exit with 0 and False means we exit with code 1
    sys.exit(int(not check))
