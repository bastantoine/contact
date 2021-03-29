import $ from "jquery"
import { Component } from "react";
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
        }).fail((_, textStatus) => console.error(textStatus));
    }

    renderDisplayedListTitle(contact: any, attributes: string[]) {
        let values: string[] = []
        for (let attribute of attributes)
            values.push(contact[attribute])
        return values.join(' ')
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
                >
                </ContactDetails>
            })}
            <Tab.Pane eventKey="#form-add-contact">
                <ContactForm initial_value={{}} config={this.state.config} submitHandler={this.addContact} ></ContactForm>
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