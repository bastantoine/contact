import React, {useState} from "react";
import {ButtonGroup, Col, Form, Row, ToggleButton} from "react-bootstrap";

import {getValueForToggle, upperFirstLetter} from "../../utils";
import {FieldConfigType} from "../Home";
import {ALLOWED_TYPES, LIST_ALLOWED_INNER_TYPES} from "../TypeComponents";

type PropsType = {
    attribute_config: FieldConfigType;
    attribute: string;
    value: any;
    onBlur: {
        (e: React.FocusEvent<any>): void;
        <T = any>(fieldOrEvent: T): T extends string ? (e: any) => void : void;
    };
    onChange: {
        (e: React.ChangeEvent<any>): void;
        <T = string | React.ChangeEvent<any>>(
            field: T
        ): T extends React.ChangeEvent<any>
            ? void
            : (e: string | React.ChangeEvent<any>) => void;
    };
    onFileInputChange: (attribute: string, file: File) => void;
    touched: any;
    errors: any;
};

function findInputTypeFromAttributeType(
    attribute_type: ALLOWED_TYPES,
    // inner_type is used only when attribute_type is a list,
    // in this case it is the type of the values inside the list
    inner_type?: typeof LIST_ALLOWED_INNER_TYPES[number] | ""
): string {
    switch (attribute_type) {
        case "image":
            return "file";
        case "list":
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return findInputTypeFromAttributeType(inner_type!);
        case "email":
            return "email";
        case "url":
            return "url";
        case "long_str":
            return "textarea";
        case "integer":
            return "number";
        default:
            return "text";
    }
}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ContactFormField(
    props: PropsType & {children?: React.ReactNode}
): JSX.Element {
    const displayed_name = props.attribute_config.display_name
        ? props.attribute_config.display_name
        : upperFirstLetter(props.attribute);
    const additional_type_parameters =
        props.attribute_config.additional_type_parameters;
    const input_type = findInputTypeFromAttributeType(
        props.attribute_config.type,
        (additional_type_parameters && additional_type_parameters.inner_type) ||
            ""
    );
    const help_text = props.attribute_config.form_help_text;
    const _getValueForToggle = (value: boolean) =>
        getValueForToggle(
            value,
            additional_type_parameters
                ? additional_type_parameters.value_true
                : undefined,
            additional_type_parameters
                ? additional_type_parameters.value_false
                : undefined
        );
    const [checked, setChecked] = useState(props.value);
    return (
        <Form.Group as={Row} controlId={`form-control-${props.attribute}`}>
            <Form.Label column sm={2}>
                <p className="text-right">{displayed_name}</p>
            </Form.Label>
            <Col sm={10}>
                {/* Setting 'undefined' as the attribute value allows to not set the attributes when the predicates evaluates to false */}
                {props.attribute_config.type === "toggle" ? (
                    <ButtonGroup toggle>
                        <ToggleButton
                            type="checkbox"
                            value={_getValueForToggle(checked)}
                            name={props.attribute}
                            checked={checked}
                            variant={checked ? "success" : "secondary"}
                            onChange={(event) => {
                                setChecked(event.currentTarget.checked);
                                props.onChange(event);
                            }}
                            onBlur={props.onBlur}
                            aria-describedby={
                                help_text
                                    ? `help-text-form-add-${props.attribute}`
                                    : undefined
                            }
                        >
                            {_getValueForToggle(checked)}
                        </ToggleButton>
                    </ButtonGroup>
                ) : props.attribute_config.type === "select" ? (
                    <Form.Control
                        as="select"
                        defaultValue={
                            props.value ? props.value : "Choose value..."
                        }
                        onChange={props.onChange}
                        onBlur={props.onBlur}
                        name={props.attribute}
                        isValid={props.touched && !props.errors}
                        isInvalid={!!props.errors}
                    >
                        <option>Choose value...</option>
                        {additional_type_parameters?.allowed_values?.map(
                            (value) => (
                                <option key={value}>{value}</option>
                            )
                        )}
                    </Form.Control>
                ) : (
                    <Form.Control
                        as={input_type === "textarea" ? "textarea" : undefined}
                        rows={input_type === "textarea" ? 3 : undefined}
                        type={input_type}
                        name={props.attribute}
                        onChange={
                            input_type !== "file"
                                ? props.onChange
                                : (event: React.FormEvent<any>) => {
                                      props.onFileInputChange(
                                          props.attribute,
                                          event.currentTarget.files[0]
                                      );
                                      props.onChange(event);
                                  }
                        }
                        onBlur={props.onBlur}
                        value={input_type !== "file" ? props.value : undefined}
                        placeholder={displayed_name}
                        aria-describedby={
                            help_text
                                ? `help-text-form-add-${props.attribute}`
                                : undefined
                        }
                        isValid={props.touched && !props.errors}
                        isInvalid={!!props.errors}
                    />
                )}
                {/* Add helper text only if the config has one set */}
                {help_text ? (
                    <Form.Text
                        id={`help-text-form-add-${props.attribute}`}
                        muted
                    >
                        {help_text}
                    </Form.Text>
                ) : (
                    <></>
                )}
                {/* Add error message if needed */}
                {props.errors ? (
                    <Form.Control.Feedback type="invalid">
                        {props.errors}
                    </Form.Control.Feedback>
                ) : (
                    <></>
                )}
            </Col>
        </Form.Group>
    );
}

export default ContactFormField;
