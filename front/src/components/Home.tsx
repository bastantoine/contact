import React, {Component} from "react";
import {Col, ListGroup, Row, Tab} from "react-bootstrap";

import {API_ENDPOINT} from "../config";
import {fetchOrThrow, fetchJsonOrThrow, join} from "../utils";
import ContactForm from "./contactForm/ContactForm";
import ContactDetails from "./ContactDetails";
import Configuration from "./configuration/Configuration";
import {
    ALLOWED_TYPES,
    FILE_FIELDS,
    LIST_ALLOWED_INNER_TYPES,
} from "./TypeComponents";
import ConfigurationOnboarding from "./configuration/ConfigurationOnboarding";

export type FieldConfigType = {
    type: ALLOWED_TYPES;
    required?: boolean;
    primary_key?: boolean;
    display_name?: string;
    main_attribute?: number;
    sort_key?: number;
    additional_type_parameters?: {
        inner_type?: typeof LIST_ALLOWED_INNER_TYPES[number];
        accepted_types?: string[];
        value_true?: string;
        value_false?: string;
        allowed_values?: string[];
    };
    form_help_text?: string;
};
export type ConfigType = {
    [k: string]: FieldConfigType;
};
type PropsType = Record<string, unknown>;
type StateType = {
    isLoaded: boolean;
    isConfigLoaded: boolean;
    isConfigEmpty: boolean;
    error: null | string;
    contacts: any[];
    files: {[k: string]: File};
    config: {
        main_attributes: string[];
        sort_keys: string[];
        attributes: string[];
        primary_key: string;
        raw_config: ConfigType;
    };
};

class Home extends Component<PropsType, StateType> {
    constructor(props: PropsType) {
        super(props);
        this.state = {
            isLoaded: false,
            isConfigLoaded: false,
            isConfigEmpty: false,
            error: null,
            contacts: [],
            files: {},
            config: {
                main_attributes: [],
                sort_keys: [],
                attributes: [],
                primary_key: "",
                raw_config: {},
            },
        };
    }

    loadConfig(): Promise<any> {
        return fetchJsonOrThrow(join(API_ENDPOINT, "config"))
            .then((config) => this.loadConfigFromJson(config))
            .catch((error: Error) => {
                this.setState({
                    error: error.message,
                    isLoaded: false,
                });
            });
    }

    loadConfigFromJson(config: {[k: string]: any}): void {
        // Check if the config is empty. From
        // https://stackoverflow.com/a/32108184
        if (
            config &&
            Object.keys(config).length === 0 &&
            config.constructor === Object
        ) {
            this.setState({
                config: {
                    main_attributes: [],
                    sort_keys: [],
                    attributes: [],
                    primary_key: "",
                    raw_config: config,
                },
                isConfigLoaded: true,
                isConfigEmpty: true,
            });
        } else {
            const attributes: string[] = [];
            const main_attributes: [number, string][] = [];
            const sort_keys: [number, string][] = [];
            let primary_key = "";
            for (const key in config) {
                attributes.push(key);
                if (config[key].main_attribute !== undefined) {
                    // This key is marked as a main attribute, which means
                    // we'll use it on the list display. It's value is the
                    // place it's supposed to have in the display, lower
                    // first, higher last.
                    main_attributes.push([config[key].main_attribute, key]);
                }
                if (config[key].sort_key !== undefined) {
                    // This key is marked as a sorting key, which means
                    // we'll use it on the to sort the list of contacts.
                    // It's value is the place it's supposed to have in the
                    // sorting process, lower first, higher last.
                    sort_keys.push([config[key].sort_key, key]);
                }
                if (
                    config[key].primary_key !== undefined &&
                    config[key].primary_key === true
                ) {
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
                    main_attributes: main_attributes
                        .sort((a, b) => a[0] - b[0])
                        .map((item) => item[1]),
                    // Same thing for the sorting keys
                    sort_keys: sort_keys
                        .sort((a, b) => a[0] - b[0])
                        .map((item) => item[1]),
                    attributes: attributes,
                    primary_key: primary_key,
                    raw_config: config,
                },
                isConfigLoaded: true,
                isConfigEmpty: false,
            });
        }
    }

    loadContacts(): Promise<any> {
        return fetchJsonOrThrow(join(API_ENDPOINT, "contact"))
            .then((contacts) => {
                this.setState({
                    contacts: contacts,
                    isLoaded: true,
                });
            })
            .catch((error: Error) => {
                this.setState({
                    error: error.message,
                    isLoaded: false,
                });
            });
    }

    sortContacts(): void {
        if (!this.state.isConfigEmpty) {
            const listContacts = this.state.contacts.slice();
            listContacts.sort((c1, c2) => {
                for (const sort_key of this.state.config.sort_keys) {
                    if (c1[sort_key] < c2[sort_key]) return -1;
                    if (c1[sort_key] > c2[sort_key]) return 1;
                }
                return 0;
            });
            this.setState({contacts: listContacts});
        }
    }

    componentDidMount(): void {
        // Load the config and the contacts, and then sort them. We need to do
        // the sort after both calls are done, because we need the config to
        // sort the list of contacts.
        Promise.all([this.loadConfig(), this.loadContacts()]).then(() =>
            this.sortContacts()
        );
    }

    private prepare_file_fields(values: {[k: string]: any}) {
        const file_fields = this.state.config.attributes.filter((attr) =>
            FILE_FIELDS.includes(
                String(this.state.config.raw_config[attr].type)
            )
        );
        for (const field of file_fields) {
            if (this.state.files[field] !== undefined) {
                // For each file passed in the form, store only the filename,
                // the upload of the file itself is done after
                values[field] = this.state.files[field].name;
            }
        }
        return values;
    }

    private addUploadedFile(attribute: string, file: File) {
        const alreadyUploadedFiles = this.state.files;
        alreadyUploadedFiles[attribute] = file;
        this.setState({files: alreadyUploadedFiles});
    }

    private uploadFilesToContact(id: string | number, method: "POST" | "PUT") {
        const files = new FormData();
        for (const [field, file] of Object.entries(this.state.files)) {
            files.append(field, file);
        }
        fetchJsonOrThrow(join(API_ENDPOINT, "contact", String(id), "files"), {
            method: method,
            body: files,
        })
            .then((data) => {
                const new_contacts = this.state.contacts
                    .slice()
                    .filter(
                        (contact) =>
                            contact[this.state.config.primary_key] !== id
                    );
                new_contacts.push(data);
                this.setState({
                    contacts: new_contacts,
                });
                this.sortContacts();
            })
            .finally(() => this.setState({files: {}}));
    }

    private deleteContact(id: string | number) {
        fetchOrThrow(join(API_ENDPOINT, "contact", String(id)), {
            method: "DELETE",
        }).then(() => {
            const filtered_contacts = this.state.contacts.filter((contact) => {
                return contact[this.state.config.primary_key] !== id;
            });
            this.setState({contacts: filtered_contacts});
        });
    }

    private addContact(values: {[k: string]: any}) {
        values = this.prepare_file_fields(values);
        return (
            fetchJsonOrThrow(join(API_ENDPOINT, "contact"), {
                method: "POST",
                body: JSON.stringify(values),
                headers: {
                    "Content-Type": "application/json",
                },
            })
                // Don't handle errors here, we'll do it when we call the handler
                .then((data) => {
                    if (Object.keys(this.state.files).length > 0) {
                        this.uploadFilesToContact(
                            data[this.state.config.primary_key],
                            "POST"
                        );
                    } else {
                        const new_contacts = this.state.contacts.slice();
                        new_contacts.push(data);
                        this.setState({
                            contacts: new_contacts,
                        });
                        this.sortContacts();
                    }
                })
        );
    }

    private editContact(id: string | number, values: {[k: string]: any}) {
        function removeEmpty(
            obj: Record<string, unknown>
        ): Record<string, unknown> {
            return Object.fromEntries(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                Object.entries(obj).filter(([_, v]) => v != null)
            );
        }
        values = this.prepare_file_fields(values);
        return (
            fetchJsonOrThrow(join(API_ENDPOINT, "contact", String(id)), {
                method: "PUT",
                body: JSON.stringify(removeEmpty(values)),
                headers: {
                    "Content-Type": "application/json",
                },
            })
                // Don't handle errors here, we'll do it when we call the handler
                .then((data) => {
                    if (Object.keys(this.state.files).length > 0) {
                        this.uploadFilesToContact(
                            data[this.state.config.primary_key],
                            "PUT"
                        );
                    } else {
                        const new_contacts = this.state.contacts
                            .slice()
                            .filter(
                                (contact) =>
                                    contact[this.state.config.primary_key] !==
                                    id
                            );
                        new_contacts.push(data);
                        this.setState({
                            contacts: new_contacts,
                        });
                        this.sortContacts();
                    }
                })
        );
    }

    configUpdatedHandler(config: {[k: string]: any}): void {
        Promise.all([this.loadConfigFromJson(config)]).then(() =>
            this.sortContacts()
        );
    }

    renderDisplayedListTitle(
        contact: {[k: string]: any},
        attributes: string[]
    ): string {
        const values: string[] = [];
        for (const attribute of attributes) values.push(contact[attribute]);
        return values.join(" ");
    }

    private renderSideBarContactList() {
        const groupedListContacts: {[k: string]: any[]} = {};
        if (this.state.config.sort_keys.length > 0) {
            const key = this.state.config.sort_keys[0];
            for (const contact of this.state.contacts) {
                const category = String(contact[key]).substring(0, 1);
                if (!groupedListContacts[category])
                    groupedListContacts[category] = [];
                groupedListContacts[category].push(contact);
            }
        } else {
            groupedListContacts[""] = this.state.contacts;
        }
        const categories = Object.keys(groupedListContacts).sort();
        return (
            <>
                <ListGroup>
                    {categories.map((category) => {
                        return (
                            <React.Fragment key={category}>
                                {category !== "" ? (
                                    <ListGroup.Item
                                        disabled
                                        className="py-0"
                                        style={{
                                            textAlign: "center",
                                            backgroundColor: "lightgray",
                                            color: "black",
                                        }}
                                    >
                                        {category.toUpperCase()}
                                    </ListGroup.Item>
                                ) : (
                                    <></>
                                )}
                                {groupedListContacts[category].map(
                                    (contact) => {
                                        return (
                                            <ListGroup.Item
                                                action
                                                href={`#display-infos-contact-${
                                                    contact[
                                                        this.state.config
                                                            .primary_key
                                                    ]
                                                }`}
                                                key={`list-group-item-${
                                                    contact[
                                                        this.state.config
                                                            .primary_key
                                                    ]
                                                }`}
                                            >
                                                {this.renderDisplayedListTitle(
                                                    contact,
                                                    this.state.config
                                                        .main_attributes
                                                )}
                                            </ListGroup.Item>
                                        );
                                    }
                                )}
                            </React.Fragment>
                        );
                    })}
                </ListGroup>
                <ListGroup className="mt-3">
                    <ListGroup.Item
                        action
                        href="#form-add-contact"
                        variant="info"
                    >
                        Add a contact
                    </ListGroup.Item>
                    <ListGroup.Item
                        action
                        href="#configuration"
                        variant="secondary"
                    >
                        Configuration
                    </ListGroup.Item>
                </ListGroup>
            </>
        );
    }

    private renderMainContactInfos() {
        // Make sure we bind the current context to the handler, so that we can
        // update the current context from the handler called in the chid component.
        // From https://stackoverflow.com/questions/38394015/how-to-pass-data-from-child-component-to-its-parent-in-reactjs#comment91623247_44467773
        this.addContact = this.addContact.bind(this);
        this.editContact = this.editContact.bind(this);
        this.deleteContact = this.deleteContact.bind(this);
        this.addUploadedFile = this.addUploadedFile.bind(this);
        this.sortContacts = this.sortContacts.bind(this);
        this.configUpdatedHandler = this.configUpdatedHandler.bind(this);
        return (
            <Tab.Content>
                {this.state.contacts.map((contact) => {
                    return (
                        <ContactDetails
                            contact={contact}
                            config={this.state.config}
                            fileInputChangeHandler={this.addUploadedFile}
                            editContactHandler={this.editContact}
                            deleteContactHandler={this.deleteContact}
                            key={`detail-contact-${
                                contact[this.state.config.primary_key]
                            }`}
                        ></ContactDetails>
                    );
                })}
                <Tab.Pane eventKey="#form-add-contact">
                    <ContactForm
                        initial_value={{}}
                        config={this.state.config}
                        fileInputChangeHandler={this.addUploadedFile}
                        submitHandler={this.addContact}
                        submitButtonMessage={"Add a contact"}
                    ></ContactForm>
                </Tab.Pane>
                <Tab.Pane eventKey="#configuration">
                    <Configuration
                        config={this.state.config}
                        configUpdatedHandler={this.configUpdatedHandler}
                    ></Configuration>
                </Tab.Pane>
            </Tab.Content>
        );
    }

    render(): JSX.Element {
        if (this.state.error) {
            return <div>{this.state.error}</div>;
        } else if (!this.state.isLoaded && !this.state.isConfigLoaded) {
            return <div>Chargement...</div>;
        } else if (this.state.isConfigEmpty) {
            return (
                <ConfigurationOnboarding
                    configUpdatedHandler={this.configUpdatedHandler}
                ></ConfigurationOnboarding>
            );
        } else {
            return (
                <Row>
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
            );
        }
    }
}

export default Home;
