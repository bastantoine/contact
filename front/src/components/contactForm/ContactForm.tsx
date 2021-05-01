import { Alert, Button, Col, Form, Row } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import React, { Component } from "react";

import { ConfigType } from "../Home";
import ContactFormField from "./ContactFormField";

type PropsType = {
    initial_value: {[k: string]: any},
    config: {
        main_attributes: string[],
        attributes: string[],
        primary_key: string,
        raw_config: ConfigType,
    },
    fileInputChangeHandler: (attribute: string, file: File) => void,
    submitHandler: (values: {}) => JQueryXHR,
    submitButtonMessage: string
}
type StateType = {
    hasErrorInSubmit: boolean,
}

class ContactForm extends Component<PropsType, StateType> {

    constructor(props: PropsType) {
        super(props);
        this.state = {
            hasErrorInSubmit: false
        }
    }

    // Helper used to create a validator that will split the values of an
    // array on the ',' and check each value individually against the schema
    // passed as parameter.
    // Taken from https://github.com/jquense/yup/issues/559#issuecomment-518953000
    private array_validator(inner_type: Yup.BaseSchema): Yup.StringSchema {
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

    private buildValidationSchema() {
        // Binding table between the types of values we can have in the DB and
        // the validators provided by Yup. The list type is provided only so
        // that the TS type checker doesn't complain, but for this case we build
        // a custom validator based on the inner_type additional parameter
        // provided in the config.
        const YUP_TYPE_BINDINGS: {[k: string]: Yup.BaseSchema} = {
            integer: Yup.number(),
            str: Yup.string(),
            image: Yup.mixed(),
            long_str: Yup.string(),
            url: Yup.string(),
            email: Yup.string().email(),
            list: Yup.array(),
            toggle: Yup.boolean(),
        }

        let shape: {[k: string]: Yup.BaseSchema} = {}
        // Build the initial values and validation shape
        // object based on the config provided by the API
        for (let attribute of this.props.config.attributes) {
            if (attribute !== this.props.config.primary_key) {
                const attribute_config = this.props.config.raw_config[attribute];
                const attribute_type = attribute_config.type;
                if (this.props.initial_value[attribute] === undefined) {
                    // Make sure all the attribute have an initial value, even if empty
                    this.props.initial_value[attribute] = '';
                }
                if (attribute_type === 'list') {
                    if (typeof this.props.initial_value[attribute] === 'string') {
                        this.props.initial_value[attribute] = [this.props.initial_value[attribute]]
                    }
                    this.props.initial_value[attribute] = this.props.initial_value[attribute].join(', ');
                }

                let validator: Yup.BaseSchema;
                if (attribute_type === 'list') {
                    const inner_type = attribute_config.additional_type_parameters!.inner_type;
                    validator = this.array_validator(YUP_TYPE_BINDINGS[inner_type!]);
                } else {
                    validator = YUP_TYPE_BINDINGS[attribute_type];
                }
                if (!!attribute_config.required) {
                    validator = validator.required('Missing value')
                }
                shape[attribute] = validator;
            }
        }
        return Yup.object().shape(shape);
    }

    render() {
        let validationSchema = this.buildValidationSchema();

        // Base formik form taken from https://hackernoon.com/building-react-forms-with-formik-yup-and-react-bootstrap-with-a-minimal-amount-of-pain-and-suffering-1sfk3xv8
        return <>
            <Formik
                initialValues={this.props.initial_value}
                validationSchema={validationSchema}
                onSubmit={(values, { setSubmitting, resetForm, setFieldError }) => {
                    let firstNonEmptyValue = Object.values(values).find((v: string) => v !== '');
                    if (firstNonEmptyValue) {
                        // At least one value is not empty
                        this.setState({hasErrorInSubmit: false});
                        // When button submits form and form is in the process of submitting, submit button is disabled
                        setSubmitting(true);
                        for (let attribute of this.props.config.attributes) {
                            const attribute_type = this.props.config.raw_config[attribute].type;
                            if (attribute_type === 'list') {
                                // Make sure the attributes that expect a
                                // list receive a list, even if empty
                                values[attribute] = values[attribute] ? values[attribute].split(',').map((val: string) => val.trim()) : [];
                            }
                            if (attribute_type === 'toggle')
                                values[attribute] = !!values[attribute] // Make sure it's a boolean
                        }
                        this.props.submitHandler(values)
                            .fail((error) => {
                                // Make sure the arrays are transformed back to string
                                // value, so that the client side validation will still
                                // work on them
                                for (let val of Object.keys(values)) {
                                    if (Array.isArray(values[val]))
                                    values[val] = values[val].join(', ');
                                }
                                setSubmitting(false);
                                this.setState({hasErrorInSubmit: true});
                                let error_message: string;
                                switch (error.responseJSON.code) {
                                    case "WRONG_TYPE":
                                        error_message = `Wrong type of value. Expected ${error.responseJSON.expected_type}`;
                                        break;
                                    case "MISSING_VALUE_REQUIRED":
                                        error_message = "Missing required value";
                                        break;
                                    default:
                                        error_message = '';
                                        break;
                                }
                                setFieldError(error.responseJSON.field, error_message);
                            })
                            .done(() => resetForm());
                    }
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
                        {this.props.config.attributes.map((attribute: string) => {
                            if (attribute !== this.props.config.primary_key) {
                                return <ContactFormField
                                    attribute_config={this.props.config.raw_config[attribute]}
                                    attribute={attribute}
                                    value={values[attribute]}
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    onFileInputChange={this.props.fileInputChangeHandler}
                                    touched={touched[attribute]}
                                    errors={errors[attribute]}
                                    key={`form-input-add-contact-${attribute}`}
                                >
                                </ContactFormField>
                            }
                            return <React.Fragment key={`form-input-add-contact-${attribute}`}></React.Fragment>;
                        })}
                        <Form.Group as={Row}>
                            <Col sm={{ span: 10, offset: 2 }}>
                                <Button type="submit" disabled={isSubmitting}>{this.props.submitButtonMessage}</Button>
                            </Col>
                        </Form.Group>
                    </Form>
                )}
            </Formik>
            {this.state.hasErrorInSubmit ?
            <Alert variant={"danger"}>
                There has been an error while submitting the form. Please retry.<br/>
            </Alert> : <></>}
        </>
    }
}

export default ContactForm