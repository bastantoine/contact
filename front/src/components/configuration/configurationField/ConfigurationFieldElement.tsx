import React from "react";
import {Col, Form, Row} from "react-bootstrap";

// Create a new props type that has the same props than From.Control, but one
// additional prop. From https://stackoverflow.com/a/55005902/
type BasePropsType = {
    label: string;
    formText?: string;
} & React.ComponentProps<typeof Form.Control>;

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function BaseConfigurationFieldElement(
    props: BasePropsType & {children?: React.ReactNode}
) {
    const {label, formText, ...formControlProps} = props;
    return (
        <Form.Group as={Row}>
            <Form.Label column xl={3}>
                {label}
            </Form.Label>
            <Col xl={9}>
                <Form.Control {...formControlProps}>
                    {props.children}
                </Form.Control>
                {formText ? <Form.Text muted>{formText}</Form.Text> : <></>}
            </Col>
        </Form.Group>
    );
}

type PropsType = {
    fieldKey: string;
    fieldName: string;
    formText?: string;
} & React.ComponentProps<typeof Form.Control>;

function Name(props: PropsType & {children?: React.ReactNode}): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Name"
            type="text"
            placeholder="Name"
            defaultValue={props.fieldName}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-name`}
            isInvalid={props.isInvalid}
            required
        />
    );
}

function Type(props: PropsType & {children?: React.ReactNode}): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Type"
            as="select"
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-type`}
            isInvalid={props.isInvalid}
            required
        >
            {props.children}
        </BaseConfigurationFieldElement>
    );
}

function InnerType(
    props: PropsType & {children?: React.ReactNode}
): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Inner type"
            as="select"
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-inner_type`}
            isInvalid={props.isInvalid}
            required
        >
            {props.children}
        </BaseConfigurationFieldElement>
    );
}

function AcceptedTypes(
    props: PropsType & {children?: React.ReactNode}
): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Accepted types"
            type="text"
            placeholder="Accepted types"
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-accepted_types`}
            isInvalid={props.isInvalid}
            required
        />
    );
}

function DisplayName(
    props: PropsType & {children?: React.ReactNode}
): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Display name"
            type="text"
            placeholder="Display name"
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-display_name`}
            isInvalid={props.isInvalid}
            required
        />
    );
}

function FormHelpText(
    props: PropsType & {children?: React.ReactNode}
): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Form help text"
            type="text"
            placeholder="Form help text"
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-form_help_text`}
            isInvalid={props.isInvalid}
            required
        />
    );
}

function MainAttribute(
    props: PropsType & {children?: React.ReactNode}
): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Main attribute value"
            type="text"
            placeholder="Main attribute value"
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-main_attribute`}
            isInvalid={props.isInvalid}
            required
        />
    );
}

function SortKey(props: PropsType & {children?: React.ReactNode}): JSX.Element {
    return (
        <BaseConfigurationFieldElement
            label="Sort key value"
            type="text"
            placeholder="Sort key value"
            defaultValue={props.defaultValue}
            onChange={props.onChange}
            onBlur={props.onBlur}
            name={`${props.fieldKey}-sort_key`}
            isInvalid={props.isInvalid}
            required
        />
    );
}

const ConfigurationFieldElement = {
    Name: Name,
    Type: Type,
    InnerType: InnerType,
    AcceptedTypes: AcceptedTypes,
    DisplayName: DisplayName,
    FormHelpText: FormHelpText,
    MainAttribute: MainAttribute,
    SortKey: SortKey,
};

export default ConfigurationFieldElement;
