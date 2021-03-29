import $ from "jquery"
import React, { useState } from "react";
import { Button, ButtonGroup, Tab } from "react-bootstrap";

import { ATTRIBUTE_TYPE_COMPONENT_MAPPING, TextComponent } from "./TypeComponents";
import ContactForm from "./ContactForm";
import { upperFirstLetter } from "../utils";

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

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ContactDetails(props: PropsType & { children?: React.ReactNode}) {
    const [isFormDisplayed, setIsFormDisplayed] = useState(false);

    return <Tab.Pane
            eventKey={`#display-infos-contact-${props.contact[props.config.primary_key]}`}
            key={`tab-pane-${props.contact[props.config.primary_key]}`}
    >
        <dl>
            {props.config.attributes.map((attribute, index) => {
                // Display only if the attribute is not the primary key
                if (attribute !== props.config.primary_key) {
                    let has_display_name = props.config.raw_config[attribute].display_name
                    // This weird syntax tells the TS compiler that the allowed
                    // types are the keys of _ATTRIBUTE_TYPE_COMPONENT_MAPPING
                    // From https://stackoverflow.com/a/57088282/
                    let attribute_type: keyof typeof ATTRIBUTE_TYPE_COMPONENT_MAPPING = props.config.raw_config[attribute].type;
                    let ComponentToUse = ATTRIBUTE_TYPE_COMPONENT_MAPPING[attribute_type] || TextComponent;
                    return <React.Fragment key={`infos-contact-${props.contact[props.config.primary_key]}-${attribute}-${index}`}>
                        <dt>{has_display_name ? props.config.raw_config[attribute].display_name : upperFirstLetter(attribute)}</dt>
                        <dd><ComponentToUse value={props.contact[attribute] ? props.contact[attribute] : ''} extra_params={props.config.raw_config[attribute].additional_type_parameters}></ComponentToUse></dd>
                    </React.Fragment>
                }
                return <></>
            })}
        </dl>
        <ButtonGroup>
            <Button variant="primary" size="sm" onClick={() => setIsFormDisplayed(!isFormDisplayed)}>
                Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => props.deleteContactHandler(props.contact[props.config.primary_key])}>
                Delete
            </Button>
        </ButtonGroup>
        {/* $.extend(true, {}, contact) allows to pass a deep copy of
            contact. This way, every change made to the values won't
            be reflect in the original object. Usefull since we
            transform each lists by joining their values with a comma
            to show them correctly in the input, but still need
            the lists almost everywhere else. */}
        {isFormDisplayed ? <ContactForm
            initial_value={$.extend(true, {}, props.contact)}
            config={props.config}
            submitHandler={((values: {}) => {
                return props.editContactHandler(
                    props.contact[props.config.primary_key],
                    values
                )
            })}
            >
        </ContactForm> : <></>}
    </Tab.Pane>
}

export default ContactDetails