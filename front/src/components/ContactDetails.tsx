import React, {useState} from "react";
import {Button, ButtonGroup, Tab} from "react-bootstrap";

import {
    ATTRIBUTE_TYPE_COMPONENT_MAPPING,
    TextComponent,
} from "./TypeComponents";
import ContactForm from "./contactForm/ContactForm";
import {deepCopy, upperFirstLetter} from "../utils";
import {ConfigType} from "./Home";

type PropsType = {
    contact: any;
    config: {
        main_attributes: string[];
        attributes: string[];
        primary_key: string;
        raw_config: ConfigType;
    };
    fileInputChangeHandler: (attribute: string, file: File) => void;
    editContactHandler: (
        id: string | number,
        values: Record<string, unknown>
    ) => Promise<void>;
    deleteContactHandler: (id: string | number) => void;
};

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ContactDetails(
    props: PropsType & {children?: React.ReactNode}
): JSX.Element {
    const [isFormDisplayed, setIsFormDisplayed] = useState(false);

    return (
        <Tab.Pane
            eventKey={`#display-infos-contact-${
                props.contact[props.config.primary_key]
            }`}
        >
            <dl>
                {props.config.attributes.map((attribute) => {
                    // Display only if the attribute is not the primary key
                    if (attribute !== props.config.primary_key) {
                        const has_display_name =
                            props.config.raw_config[attribute].display_name;
                        const attribute_type =
                            props.config.raw_config[attribute].type;
                        const ComponentToUse =
                            ATTRIBUTE_TYPE_COMPONENT_MAPPING[attribute_type] ||
                            TextComponent;
                        return (
                            <React.Fragment
                                key={`infos-contact-${
                                    props.contact[props.config.primary_key]
                                }-${attribute}`}
                            >
                                <dt>
                                    {has_display_name
                                        ? props.config.raw_config[attribute]
                                              .display_name
                                        : upperFirstLetter(attribute)}
                                </dt>
                                <dd>
                                    <ComponentToUse
                                        value={
                                            props.contact[attribute]
                                                ? props.contact[attribute]
                                                : ""
                                        }
                                        extra_params={
                                            props.config.raw_config[attribute]
                                                .additional_type_parameters
                                        }
                                    ></ComponentToUse>
                                </dd>
                            </React.Fragment>
                        );
                    }
                    return (
                        <React.Fragment
                            key={`infos-contact-${
                                props.contact[props.config.primary_key]
                            }-${attribute}`}
                        ></React.Fragment>
                    );
                })}
            </dl>
            <ButtonGroup>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsFormDisplayed(!isFormDisplayed)}
                >
                    Edit
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                        props.deleteContactHandler(
                            props.contact[props.config.primary_key]
                        )
                    }
                >
                    Delete
                </Button>
            </ButtonGroup>
            {/* Pass a deep copy of the instance of contact. This way, every
            change made to the values won't be reflect in the original object.
            Usefull since we transform each lists by joining their values with a
            comma to show them correctly in the input, but still need the lists
            almost everywhere else. */}
            {isFormDisplayed ? (
                <ContactForm
                    initial_value={deepCopy(props.contact)}
                    config={props.config}
                    fileInputChangeHandler={props.fileInputChangeHandler}
                    submitHandler={(values: Record<string, unknown>) => {
                        return props.editContactHandler(
                            props.contact[props.config.primary_key],
                            values
                        );
                    }}
                    submitButtonMessage={"Edit the contact"}
                ></ContactForm>
            ) : (
                <></>
            )}
        </Tab.Pane>
    );
}

export default ContactDetails;
