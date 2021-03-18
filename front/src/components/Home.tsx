import $ from "jquery"
import React from "react";
import { Component } from "react";
import { Col, ListGroup, Row, Tab } from "react-bootstrap";

import { API_ENDPOINT } from "../config";
import { join } from "../utils";

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

    render() {
        const { isLoaded, isConfigLoaded, error, contacts, config } = this.state
        if (error) {
            return <div>Erreur {error.status} : {error.responseText}</div>
        } else if (!isLoaded && !isConfigLoaded) {
            return <div>Chargement...</div>
        } else {
            return <Row>
                <Col lg={12}>
                    <Tab.Container>
                        <Row>
                            <Col sm={4}>
                                <ListGroup>
                                    {contacts.map(contact => {
                                        return <ListGroup.Item
                                            action
                                            href={`#display-infos-contact-${contact[config.primary_key]}`}
                                            key={`list-group-item-${contact[config.primary_key]}`}
                                        >
                                            {this.renderDisplayedListTitle(contact, config.main_attributes)}
                                        </ListGroup.Item>
                                    })}
                                </ListGroup>
                            </Col>
                            <Col sm={8}>
                                <Tab.Content>
                                    {contacts.map(contact => {
                                        return <Tab.Pane
                                            eventKey={`#display-infos-contact-${contact[config.primary_key]}`}
                                            key={`tab-pane-${contact[config.primary_key]}`}
                                        >
                                            <dl>
                                                {config.attributes.map((attribute, index) => {
                                                    // Display only if the attribute is not the primary key
                                                    if (attribute !== config.primary_key) {
                                                        let has_display_name = config.raw_config[attribute].display_name
                                                        return <React.Fragment key={`infos-contact-${contact[config.primary_key]}-${attribute}-${index}`}>
                                                            <dt>{has_display_name ? config.raw_config[attribute].display_name : attribute}</dt>
                                                            <dd>{contact[attribute] ? contact[attribute] : ''}</dd>
                                                        </React.Fragment>
                                                    }
                                                    return <></>
                                                })}
                                            </dl>
                                        </Tab.Pane>
                                    })}
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Col>
            </Row>
        }
    }
}

export default Home