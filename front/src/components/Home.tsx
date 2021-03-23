import $ from "jquery"
import React from "react";
import { Component } from "react";
import { Button, Col, Form, ListGroup, Row, Tab } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";

import { API_ENDPOINT } from "../config";
import { join } from "../utils";
import { ATTRIBUTE_TYPE_COMPONENT_MAPPING, TextComponent } from "./TypeComponents";

type PropsType = {}
type StateType = {
    isLoaded: boolean,
    isConfigLoaded: boolean,
    error: null | JQuery.jqXHR,
    contacts: any[],
    config: {
        main_attributes: string[],
        attributes: string[],
        primary_key: string,
        raw_config: any,
    },
}

class Home extends Component<PropsType, StateType> {

    constructor(props: PropsType) {
        super(props);
        this.state = {
            isLoaded: false,
            isConfigLoaded: false,
            error: null,
            contacts: [],
            config: {
                main_attributes: [],
                attributes: [],
                primary_key: '',
                raw_config: {}
            },
        }
    }

    loadConfig() {
        $.get(join(API_ENDPOINT, 'config'))
            .done((config) => {
                let attributes: string[] = [];
                let main_attributes: [number, string][] = [];
                let primary_key = '';
                for (let key in config) {
                    attributes.push(key);
                    if (config[key].main_attribute !== undefined) {
                        // This key is marked as a main attribute, which means
                        // we'll use it on the list display. It's value is the
                        // place it's supposed to have in the display, lower
                        // first, higher last.
                        main_attributes.push([config[key].main_attribute, key])
                    }
                    if (config[key].primary_key !== undefined && config[key].primary_key === true) {
                        // This is key is marked as the primary key, which means
                        // we can use it to uniquely identify a contact and use
                        // to perfom PUT and DELETE on the API.
                        primary_key = key;
                    }
                }
                this.setState({
                    config: {
                        // Sort the main attributes by their value, to respect
                        // the order the user wanted, and then get only the key
                        main_attributes: main_attributes.sort((a, b) => a[0] - b[0]).map((item) => item[1]),
                        attributes: attributes,
                        primary_key: primary_key,
                        raw_config: config,
                    },
                    isConfigLoaded: true
                });
            })
            .fail((error) => {
                this.setState({
                    error: error,
                    isConfigLoaded: false
                });
            })
    }

    loadContacts() {
        $.get(join(API_ENDPOINT, 'contact'))
            .done((contacts) => {
                this.setState({
                    contacts: contacts,
                    isLoaded: true
                });
            })
            .fail((error) => {
                this.setState({
                    error: error,
                    isLoaded: false
                });
            });
    }

    componentDidMount() {
        this.loadConfig();
        this.loadContacts();
    }

    private deleteContact(id: string|number) {
        $.ajax({
            url: join(API_ENDPOINT, 'contact', String(id)),
            method: 'DELETE'
        }).done(() => {
            let filtered_contacts = this.state.contacts.filter((contact) => {
                return contact[this.state.config.primary_key] !== id
            })
            this.setState({contacts: filtered_contacts})
        })
    }

    renderDisplayedListTitle(contact: any, attributes: string[]) {
        let values: string[] = []
        for (let attribute of attributes)
            values.push(contact[attribute])
        return values.join(' ')
    }

    private upperFirstLetter(input: string): string {
        return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
    }

    private renderSideBarContactList() {
        return <ListGroup>
            {this.state.contacts.map(contact => {
                return <ListGroup.Item
                    action
                    href={`#display-infos-contact-${contact[this.state.config.primary_key]}`}
                    key={`list-group-item-${contact[this.state.config.primary_key]}`}
                >
                    {this.renderDisplayedListTitle(contact, this.state.config.main_attributes)}
                </ListGroup.Item>
            })}
            <ListGroup.Item action href="#form-add-contact">
                Add a contact
            </ListGroup.Item>
        </ListGroup>
    }

    private renderMainContactInfos() {
        return <Tab.Content>
            {this.state.contacts.map(contact => {
                return <Tab.Pane
                    eventKey={`#display-infos-contact-${contact[this.state.config.primary_key]}`}
                    key={`tab-pane-${contact[this.state.config.primary_key]}`}
                >
                    <dl>
                        {this.state.config.attributes.map((attribute, index) => {
                            // Display only if the attribute is not the primary key
                            if (attribute !== this.state.config.primary_key) {
                                let has_display_name = this.state.config.raw_config[attribute].display_name
                                // This weird syntax tells the TS compiler that the allowed
                                // types are the keys of _ATTRIBUTE_TYPE_COMPONENT_MAPPING
                                // From https://stackoverflow.com/a/57088282/
                                let attribute_type: keyof typeof ATTRIBUTE_TYPE_COMPONENT_MAPPING = this.state.config.raw_config[attribute].type;
                                let ComponentToUse = ATTRIBUTE_TYPE_COMPONENT_MAPPING[attribute_type] || TextComponent;
                                return <React.Fragment key={`infos-contact-${contact[this.state.config.primary_key]}-${attribute}-${index}`}>
                                    <dt>{has_display_name ? this.state.config.raw_config[attribute].display_name : this.upperFirstLetter(attribute)}</dt>
                                    <dd><ComponentToUse value={contact[attribute] ? contact[attribute] : ''} extra_params={this.state.config.raw_config[attribute].additional_type_parameters}></ComponentToUse></dd>
                                </React.Fragment>
                            }
                            return <></>
                        })}
                    </dl>
                    <Button variant="danger" size="sm" block onClick={() => this.deleteContact(contact[this.state.config.primary_key])}>
                        Delete the contact
                    </Button>
                </Tab.Pane>
            })}
            <Tab.Pane eventKey="#form-add-contact">
                {this.renderAddContactForm()}
            </Tab.Pane>
        </Tab.Content>
    }

    private renderAddContactForm() {

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
        let initialValues: {[k: string]: any} = {}
        // Build the initial values and validation shape
        // object based on the config provided by the API
        for (let attribute of Object.keys(this.state.config.raw_config)) {
            if (attribute !== this.state.config.primary_key) {
                initialValues[attribute] = ''

                const attribute_config = this.state.config.raw_config[attribute];
                const attribute_type: keyof typeof YUP_TYPE_BINDINGS = attribute_config.type;
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
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={(values, { setSubmitting, resetForm }) => {
                // When button submits form and form is in the process of submitting, submit button is disabled
                setSubmitting(true);
                for (let attribute of Object.keys(this.state.config.raw_config)) {
                    const attribute_type: string = this.state.config.raw_config[attribute].type;
                    if (attribute_type === 'list') {
                        // Make sure the attributes that expect a
                        // list receive a list, even if empty
                        values[attribute] = values[attribute] ? values[attribute].split(',').map((val: string) => val.trim()) : [];
                    }
                }

                $.post({
                    url: join(API_ENDPOINT, 'contact'),
                    data: JSON.stringify(values),
                    contentType: 'application/json',
                }).done((data) => {
                    let new_contacts = this.state.contacts.slice();
                    new_contacts.push(data)
                    this.setState({
                        contacts: new_contacts,
                    });
                    resetForm();
                }).fail((_, textStatus) => console.error(textStatus));
            }}
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
                    {Object.keys(this.state.config.raw_config).map((attribute: string) => {
                        if (attribute !== this.state.config.primary_key) {
                            const config_attribute = this.state.config.raw_config[attribute];
                            let has_display_name = config_attribute.display_name;
                            let displayed_name = has_display_name ? config_attribute.display_name : this.upperFirstLetter(attribute);
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
                        return <></>;
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

    render() {
        if (this.state.error) {
            return <div>Erreur {this.state.error.status} : {this.state.error.responseText}</div>
        } else if (!this.state.isLoaded && !this.state.isConfigLoaded) {
            return <div>Chargement...</div>
        } else {
            return <Row>
                <Col lg={12}>
                    <Tab.Container>
                        <Row>
                            <Col sm={4}>
                                {this.renderSideBarContactList()}
                            </Col>
                            <Col sm={8}>
                                {this.renderMainContactInfos()}
                            </Col>
                        </Row>
                    </Tab.Container>
                </Col>
            </Row>
        }
    }
}

export default Home