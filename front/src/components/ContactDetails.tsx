import $ from "jquery"
import React from "react";
import { Component } from "react";
import { Button, ButtonGroup, Tab } from "react-bootstrap";

import { ATTRIBUTE_TYPE_COMPONENT_MAPPING, TextComponent } from "./TypeComponents";
import ContactForm from "./ContactForm";

type PropsType = {
    contact: any,
    config: {
        main_attributes: string[],
        attributes: string[],
        primary_key: string,
        raw_config: any,
    },
    editContactHandler: (id: string|number, values: {}) => JQueryXHR,
    deleteContactHandler: (id: string|number) => void
}
type StateType = {}

class ContactDetails extends Component<PropsType, StateType> {

    private upperFirstLetter(input: string): string {
        return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
    }

    render() {
        return <Tab.Pane
            eventKey={`#display-infos-contact-${this.props.contact[this.props.config.primary_key]}`}
            key={`tab-pane-${this.props.contact[this.props.config.primary_key]}`}
        >
            <dl>
                {this.props.config.attributes.map((attribute, index) => {
                    // Display only if the attribute is not the primary key
                    if (attribute !== this.props.config.primary_key) {
                        let has_display_name = this.props.config.raw_config[attribute].display_name
                        // This weird syntax tells the TS compiler that the allowed
                        // types are the keys of _ATTRIBUTE_TYPE_COMPONENT_MAPPING
                        // From https://stackoverflow.com/a/57088282/
                        let attribute_type: keyof typeof ATTRIBUTE_TYPE_COMPONENT_MAPPING = this.props.config.raw_config[attribute].type;
                        let ComponentToUse = ATTRIBUTE_TYPE_COMPONENT_MAPPING[attribute_type] || TextComponent;
                        return <React.Fragment key={`infos-contact-${this.props.contact[this.props.config.primary_key]}-${attribute}-${index}`}>
                            <dt>{has_display_name ? this.props.config.raw_config[attribute].display_name : this.upperFirstLetter(attribute)}</dt>
                            <dd><ComponentToUse value={this.props.contact[attribute] ? this.props.contact[attribute] : ''} extra_params={this.props.config.raw_config[attribute].additional_type_parameters}></ComponentToUse></dd>
                        </React.Fragment>
                    }
                    return <></>
                })}
            </dl>
            <ButtonGroup>
                <Button variant="primary" size="sm">
                    Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => this.props.deleteContactHandler(this.props.contact[this.props.config.primary_key])}>
                    Delete
                </Button>
            </ButtonGroup>
            {/* $.extend(true, {}, contact) allows to pass a deep copy of
                contact. This way, every change made to the values won't
                be reflect in the original object. Usefull since we
                transform each lists by joining their values with a comma
                to show them correctly in the input, but still need
                the lists almost everywhere else. */}
            <ContactForm
                initial_value={$.extend(true, {}, this.props.contact)}
                config={this.props.config}
                submitHandler={((values: {}) => {
                    return this.props.editContactHandler(
                        this.props.contact[this.props.config.primary_key],
                        values
                    )
                })}
                >
            </ContactForm>
        </Tab.Pane>
    }
}

export default ContactDetails