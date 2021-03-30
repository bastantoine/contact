import { Button, Col, Form, Row } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import React from "react";

import { ATTRIBUTE_TYPE_COMPONENT_MAPPING } from "./TypeComponents";
import { upperFirstLetter } from "../utils";

type PropsType = {
    initial_value: {[k: string]: any},
    config: {
        main_attributes: string[],
        attributes: string[],
        primary_key: string,
        raw_config: any,
    },
    submitHandler: (values: {}) => JQueryXHR
}

// Helper used to create a validator that will split the values of an
// array on the ',' and check each value individually against the schema
// passed as parameter.
// Taken from https://github.com/jquense/yup/issues/559#issuecomment-518953000
function array_validator(inner_type: Yup.BaseSchema): Yup.StringSchema {
    return Yup.string()
        .test({
            test: function(value: string | undefined) {
                if (!value)
                    return true

                // Find the first value that doesn't match the given validator
                const firstInvalidValue = value
                    .split(",")
                    .map(v => v.trim())
                    .filter(v => v !== '')
                    .find(v => !inner_type.isValidSync(v));

                return !firstInvalidValue;
            }
        })
}

function findInputTypeFromAttributeType(
    attribute_type: keyof typeof ATTRIBUTE_TYPE_COMPONENT_MAPPING,
    // inner_type is used only when attribute_type is a list,
    // in this case it is the type of the values inside the list
    inner_type?: keyof typeof ATTRIBUTE_TYPE_COMPONENT_MAPPING
): string {
    switch (attribute_type) {
        case "image":
            return "file";
        case "list":
            return findInputTypeFromAttributeType(inner_type!);
        case "email":
            return "email";
        case "url":
            return "url";
        case "long_str":
            return "textarea";
        default:
            return "text";
    }
}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ContactForm(props: PropsType & { children?: React.ReactNode}) {
    // Binding table between the types of values we can have in the DB and
    // the validators provided by Yup. The list type is provided only so
    // that the TS type checker doesn't complain, but for this case we build
    // a custom validator based on the inner_type additional parameter
    // provided in the config.
    const YUP_TYPE_BINDINGS = {
        integer: Yup.number(),
        str: Yup.string(),
        image: Yup.mixed(),
        long_str: Yup.string(),
        url: Yup.string(),
        email: Yup.string().email(),
        list: Yup.array(),
    }

    let shape: {[k: string]: Yup.BaseSchema} = {}
    // Build the initial values and validation shape
    // object based on the config provided by the API
    for (let attribute of props.config.attributes) {
        if (attribute !== props.config.primary_key) {
            const attribute_config = props.config.raw_config[attribute];
            const attribute_type: keyof typeof YUP_TYPE_BINDINGS = attribute_config.type;
            if (props.initial_value[attribute] === undefined) {
                // Make sure all the attribute have an initial value, even if empty
                props.initial_value[attribute] = '';
            }
            if (attribute_type === 'list') {
                if (typeof props.initial_value[attribute] === 'string') {
                    props.initial_value[attribute] = [props.initial_value[attribute]]
                }
                props.initial_value[attribute] = props.initial_value[attribute].join(', ');
            }

            let validator: Yup.BaseSchema;
            if (attribute_type === 'list') {
                const inner_type: keyof typeof YUP_TYPE_BINDINGS = attribute_config.additional_type_parameters.inner_type;
                validator = array_validator(YUP_TYPE_BINDINGS[inner_type]);
            } else {
                validator = YUP_TYPE_BINDINGS[attribute_type];
            }
            if (!!attribute_config.required) {
                validator = validator.required('Missing value')
            }
            shape[attribute] = validator;
        }
    }
    const validationSchema = Yup.object().shape(shape);

    // Base formik form taken from https://hackernoon.com/building-react-forms-with-formik-yup-and-react-bootstrap-with-a-minimal-amount-of-pain-and-suffering-1sfk3xv8
    return <Formik
        initialValues={props.initial_value}
        validationSchema={validationSchema}
        onSubmit={(values, { setSubmitting, resetForm }) => {
            // When button submits form and form is in the process of submitting, submit button is disabled
            setSubmitting(true);
            for (let attribute of props.config.attributes) {
                const attribute_type: string = props.config.raw_config[attribute].type;
                if (attribute_type === 'list') {
                    // Make sure the attributes that expect a
                    // list receive a list, even if empty
                    values[attribute] = values[attribute] ? values[attribute].split(',').map((val: string) => val.trim()) : [];
                }
            }
            props.submitHandler(values)
                .done(() => resetForm());
        }}
        enableReinitialize
    >
    {/* Callback function containing Formik state and helpers that handle common form actions */}
    {({ values,
        errors,
        touched,
        handleChange,
        handleBlur,
        handleSubmit,
        isSubmitting}) => (
            // We need the noValidate so that the browser will not try to
            // valide the inputs and won't display any error message that
            // would mess up with the validation we already have.
            <Form onSubmit={handleSubmit} noValidate>
                {props.config.attributes.map((attribute: string) => {
                    if (attribute !== props.config.primary_key) {
                        const config_attribute = props.config.raw_config[attribute];
                        let has_display_name = config_attribute.display_name;
                        let displayed_name = has_display_name ? config_attribute.display_name : upperFirstLetter(attribute);
                        let input_type = findInputTypeFromAttributeType(
                            config_attribute.type,
                            (config_attribute.additional_type_parameters &&
                            config_attribute.additional_type_parameters.inner_type
                            ) || ''
                        );
                        let help_text = config_attribute.form_help_text;
                        return <Form.Group as={Row} controlId={`form-control-${attribute}`} key={`form-input-add-contact-${attribute}`}>
                            <Form.Label column sm={2}>
                                <p className="text-right">{displayed_name}</p>
                            </Form.Label>
                            <Col sm={10}>
                                {/* Setting 'undefined' as the attribute value allows to not set the attributes when the predicates evaluates to false */}
                                <Form.Control
                                    as={input_type === "textarea" ? "textarea" : undefined}
                                    rows={input_type === "textarea" ? 3 : undefined}
                                    type={input_type}
                                    name={attribute}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    value={values[attribute]}
                                    placeholder={displayed_name}
                                    aria-describedby={help_text ? `help-text-form-add-${attribute}` : undefined}
                                    isValid={touched[attribute] && !errors[attribute]}
                                    isInvalid={!!errors[attribute]}
                                />
                                {/* Add helper text only if the config has one set */}
                                {help_text ? <Form.Text id={`help-text-form-add-${attribute}`} muted>{help_text}</Form.Text> : <></>}
                                {/* Add error message if needed */}
                                {!!errors[attribute] ? <Form.Control.Feedback type="invalid">{errors[attribute]}</Form.Control.Feedback> : <></>}
                            </Col>
                        </Form.Group>
                    }
                    return <React.Fragment key={`form-input-add-contact-${attribute}`}></React.Fragment>;
                })}
                <Form.Group as={Row}>
                    <Col sm={{ span: 10, offset: 2 }}>
                        <Button type="submit" disabled={isSubmitting}>Add contact</Button>
                    </Col>
                </Form.Group>
            </Form>
        )}
    </Formik>
}

export default ContactForm