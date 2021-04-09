import $ from "jquery"
import React, { Component } from "react";
import { Col, ListGroup, Row, Tab } from "react-bootstrap";

import { API_ENDPOINT } from "../config";
import { join } from "../utils";
import ContactForm from "./ContactForm";
import ContactDetails from "./ContactDetails";

type PropsType = {}
type StateType = {
    isLoaded: boolean,
    isConfigLoaded: boolean,
    error: null | JQuery.jqXHR,
    contacts: any[],
    config: {
        main_attributes: string[],
        sort_keys: string[],
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
                sort_keys: [],
                attributes: [],
                primary_key: '',
                raw_config: {}
            },
        }
    }

    loadConfig() {
        return $.get(join(API_ENDPOINT, 'config'))
            .done((config) => {
                let attributes: string[] = [];
                let main_attributes: [number, string][] = [];
                let sort_keys: [number, string][] = [];
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
                    if (config[key].sort_key !== undefined) {
                        // This key is marked as a sorting key, which means
                        // we'll use it on the to sort the list of contacts.
                        // It's value is the place it's supposed to have in the
                        // sorting process, lower first, higher last.
                        sort_keys.push([config[key].sort_key, key])
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
                        // Same thing for the sorting keys
                        sort_keys: sort_keys.sort((a, b) => a[0] - b[0]).map((item) => item[1]),
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
        return $.get(join(API_ENDPOINT, 'contact'))
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

    sortContacts() {
        let listContacts = this.state.contacts.slice();
        listContacts.sort((c1, c2) => {
            for (let sort_key of this.state.config.sort_keys) {
                if (c1[sort_key] < c2[sort_key]) return -1;
	            if (c1[sort_key] > c2[sort_key]) return 1;
            }
            return 0
        });
        this.setState({contacts: listContacts});
    }

    componentDidMount() {
        // Load the config and the contacts, and then sort them. We need to do
        // the sort after both calls are done, because we need the config to
        // sort the list of contacts.
        $.when(this.loadConfig(), this.loadContacts()).done(() => this.sortContacts());
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

    private addContact(values: {}) {
        return $.post({
            url: join(API_ENDPOINT, 'contact'),
            data: JSON.stringify(values),
            contentType: 'application/json',
        }).done((data) => {
            let new_contacts = this.state.contacts.slice();
            new_contacts.push(data);
            this.setState({
                contacts: new_contacts,
            });
            this.sortContacts();
        }).fail((_, textStatus) => console.error(textStatus));
    }

    private editContact(id: string|number, values: {}) {
        function removeEmpty(obj: {}): {} {
            return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null));
        }
        return $.ajax({
            url: join(API_ENDPOINT, 'contact', String(id)),
            method: 'PUT',
            data: JSON.stringify(removeEmpty(values)),
            contentType: 'application/json'
        }).done((data) => {
            let new_contacts = this.state.contacts
                .slice()
                .filter(contact => contact[this.state.config.primary_key] !== id);
            new_contacts.push(data);
            this.setState({
                contacts: new_contacts,
            });
            this.sortContacts();
        }).fail((_, textStatus) => console.error(textStatus));
    }

    renderDisplayedListTitle(contact: any, attributes: string[]) {
        let values: string[] = []
        for (let attribute of attributes)
            values.push(contact[attribute])
        return values.join(' ')
    }

    private renderSideBarContactList() {
        let groupedListContacts: {[k: string]: any[]} = {};
        if (this.state.config.sort_keys.length > 0) {
            const key = this.state.config.sort_keys[0];
            for (let contact of this.state.contacts) {
                const category = String(contact[key]).substring(0, 1);
                if (!groupedListContacts[category]) groupedListContacts[category] = []
                groupedListContacts[category].push(contact)
            }
        } else {
            groupedListContacts[""] = this.state.contacts;
        }
        const categories = Object.keys(groupedListContacts).sort();
        return <>
            <ListGroup>
                {categories.map(category => {
                    return <React.Fragment key={category}>
                        {category !== '' ? <ListGroup.Item
                            disabled
                            className="py-0"
                            style={{textAlign: "center", backgroundColor: "lightgray", color: "black"}}
                        >
                            {category.toUpperCase()}
                        </ListGroup.Item> : <></>}
                        {groupedListContacts[category].map(contact => {
                            return <ListGroup.Item
                            action
                            href={`#display-infos-contact-${contact[this.state.config.primary_key]}`}
                            key={`list-group-item-${contact[this.state.config.primary_key]}`}
                            >
                                {this.renderDisplayedListTitle(contact, this.state.config.main_attributes)}
                            </ListGroup.Item>
                        })}
                    </React.Fragment>
                })}
            </ListGroup>
            <ListGroup className="mt-3">
                <ListGroup.Item action href="#form-add-contact" variant="info">
                    Add a contact
                </ListGroup.Item>
            </ListGroup>
        </>
    }

    private renderMainContactInfos() {
        // Make sure we bind the current context to the handler, so that we can
        // update the current context from the handler called in the chid component.
        // From https://stackoverflow.com/questions/38394015/how-to-pass-data-from-child-component-to-its-parent-in-reactjs#comment91623247_44467773
        this.addContact = this.addContact.bind(this);
        this.editContact = this.editContact.bind(this);
        this.deleteContact = this.deleteContact.bind(this);
        return <Tab.Content>
            {this.state.contacts.map(contact => {
                return <ContactDetails
                    contact={contact}
                    config={this.state.config}
                    editContactHandler={this.editContact}
                    deleteContactHandler={this.deleteContact}
                    key={`detail-contact-${contact[this.state.config.primary_key]}`}
                >
                </ContactDetails>
            })}
            <Tab.Pane eventKey="#form-add-contact">
                <ContactForm initial_value={{}} config={this.state.config} submitHandler={this.addContact} submitButtonMessage={"Add a contact"}></ContactForm>
            </Tab.Pane>
        </Tab.Content>
    }

    render() {
        if (this.state.error) {
            return <div>Erreur {this.state.error.status} : {this.state.error.responseText}</div>
        } else if (!this.state.isLoaded && !this.state.isConfigLoaded) {
            return <div>Chargement...</div>
        } else {
            return <Row>
                <Col lg={12}>
                    {/* Setting transition to false allows to fix the warning :
                    "findDOMNode is deprecated in StrictMode." (from
                    https://github.com/react-bootstrap/react-bootstrap/issues/3518).
                    Looks like also that this issue will be fixed when
                    react-bootstrap will support Bootstrap v5
                    (https://github.com/react-bootstrap/react-bootstrap/pull/5687) */}
                    <Tab.Container transition={false}>
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