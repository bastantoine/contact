import $ from "jquery"
import React from "react";
import { Component } from "react";
import { Button, Col, Form, ListGroup, Row, Tab } from "react-bootstrap";
import { Formik } from "formik";

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

        let initialValues: {[k: string]: any} = {}
        for (let attribute of Object.keys(this.state.config.raw_config)) {
            if (attribute !== this.state.config.primary_key)
                initialValues[attribute] = ''
        }

        // Base formik form taken from https://hackernoon.com/building-react-forms-with-formik-yup-and-react-bootstrap-with-a-minimal-amount-of-pain-and-suffering-1sfk3xv8
        return <Formik
            initialValues={initialValues}
            onSubmit={(values, { setSubmitting, resetForm }) => {
                // When button submits form and form is in the process of submitting, submit button is disabled
                setSubmitting(true);
                // Simulate submitting to database, shows us values submitted, resets form
                setTimeout(() => {
                    alert(JSON.stringify(values, null, 2));
                    resetForm();
                    setSubmitting(false);
                }, 500);
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
                <Form onSubmit={handleSubmit}>
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
                                    />
                                    {/* Add helper text only if the config has one set */}
                                    {help_text ? <Form.Text id={`help-text-form-add-${attribute}`} muted>{help_text}</Form.Text> : <></>}
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