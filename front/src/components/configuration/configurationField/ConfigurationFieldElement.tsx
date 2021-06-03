import React from "react";
import { Col, Form, Row } from "react-bootstrap";

// Create a new props type that has the same props than From.Control, but one
// additional prop. From https://stackoverflow.com/a/55005902/
type PropsType = {
    label: string
    formText?: string
} & React.ComponentProps<typeof Form.Control>

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ConfigurationFieldElement(props: PropsType & { children?: React.ReactNode}) {

    const {label, formText, ...formControlProps} = props;
    return <Form.Group as={Row}>
        <Form.Label column xl={3}>{label}</Form.Label>
        <Col xl={9}>
            <Form.Control {...formControlProps}>{props.children}</Form.Control>
            {formText ? <Form.Text muted>{formText}</Form.Text> : <></>}
        </Col>
    </Form.Group>
}

export default ConfigurationFieldElement
