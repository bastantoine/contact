import React, { useState } from "react";
import { Button, ButtonGroup, Col, Collapse, Form, Row } from "react-bootstrap";
import { FieldConfigType } from "../Home";
import { ATTRIBUTE_TYPE_COMPONENT_MAPPING } from "../TypeComponents";
import './ConfigurationField.css'

type PropsType = {
    fieldName: string,
    fieldConfig: FieldConfigType,
}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ConfigurationField(props: PropsType & { children?: React.ReactNode}) {
    const [isButtonDisplayedNameDisplayed, setIsButtonDisplayedNameDisplayed] = useState(props.fieldConfig.display_name !== undefined);
    const [isButtonFormHelpTextDisplayed, setIsButtonFormHelpTextDisplayed] = useState(props.fieldConfig.form_help_text !== undefined);
    const [isButtonMainAttributeDisplayed, setIsButtonMainAttributeDisplayed] = useState(props.fieldConfig.main_attribute !== undefined);
    const [isButtonSortKeyDisplated, setIsButtonSortKeyDisplated] = useState(props.fieldConfig.sort_key !== undefined);
    const [open, setOpen] = useState(false);

    let title = ((props.fieldConfig.display_name && props.fieldConfig.display_name) ||
                 ((props.fieldName !== '') && props.fieldName) ||
                 ''
                );

    return <>
        <div className="field-configuration-form">
            <div
                onClick={() => setOpen(!open)}
                aria-controls={`config-form-field-${props.fieldName}`}
                aria-expanded={open}
                className="field-configuration-name-title"
            >
                <span className="field-configuration-name-title-value">{title !== '' ? title : <i>&lt; New field &gt;</i>}</span>
            </div>
            <Collapse in={open}>
                <div id={`config-form-field-${props.fieldName}`}>
                <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Name
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control type="text" placeholder="Name" defaultValue={props.fieldName} required />
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Type
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control as="select" defaultValue={Object.keys(ATTRIBUTE_TYPE_COMPONENT_MAPPING).includes(String(props.fieldConfig.type)) ? props.fieldConfig.type : "Choose type..."} required>
                            <option>Choose type...</option>
                            {Object.keys(ATTRIBUTE_TYPE_COMPONENT_MAPPING).map((type) => <option key={type}>{type}</option>)}
                        </Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column xl={3}></Form.Label>
                    <Col xl={9}>
                        <Form.Row>
                            <Form.Check type="checkbox" label="Required" defaultChecked={props.fieldConfig.required === true ? true : undefined} />
                            <Form.Check
                                type="checkbox"
                                label="Primary key"
                                defaultChecked={props.fieldConfig.required === true ? true : undefined}
                                style={{marginLeft: '10px'}}
                            />
                        </Form.Row>
                    </Col>
                </Form.Group>
                <Row>
                    <Col xl={12} style={{marginBottom: '16px'}}>
                        <ButtonGroup aria-label="Basic example" className="d-flex">
                            <Button
                                variant={isButtonDisplayedNameDisplayed ? "outline-success" : "outline-secondary"}
                                className="w-100"
                                onClick={() => setIsButtonDisplayedNameDisplayed(!isButtonDisplayedNameDisplayed)}
                            >
                                Displayed name
                            </Button>
                            <Button
                                variant={isButtonFormHelpTextDisplayed ? "outline-success" : "outline-secondary"}
                                className="w-100"
                                onClick={() => setIsButtonFormHelpTextDisplayed(!isButtonFormHelpTextDisplayed)}
                            >
                                Form help text
                            </Button>
                            <Button
                                variant={isButtonMainAttributeDisplayed ? "outline-success" : "outline-secondary"}
                                className="w-100"
                                onClick={() => setIsButtonMainAttributeDisplayed(!isButtonMainAttributeDisplayed)}
                            >
                                Main attribute value
                            </Button>
                            <Button
                                variant={isButtonSortKeyDisplated ? "outline-success" : "outline-secondary"}
                                className="w-100"
                                onClick={() => setIsButtonSortKeyDisplated(!isButtonSortKeyDisplated)}
                            >
                                Sort key value
                            </Button>
                        </ButtonGroup>
                    </Col>
                </Row>
                {isButtonDisplayedNameDisplayed ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Display name
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control type="text" placeholder="Display name" defaultValue={props.fieldConfig.display_name} />
                    </Col>
                </Form.Group> : <></>}
                {isButtonFormHelpTextDisplayed ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Form help text
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control type="text" placeholder="Form help text" defaultValue={props.fieldConfig.form_help_text} />
                    </Col>
                </Form.Group> : <></>}
                {isButtonMainAttributeDisplayed ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Main attribute value
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control type="text" placeholder="Main attribute value" defaultValue={props.fieldConfig.main_attribute} />
                    </Col>
                </Form.Group> : <></>}
                {isButtonSortKeyDisplated ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Sort key value
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control type="text" placeholder="Sort key value" defaultValue={props.fieldConfig.sort_key} />
                    </Col>
                </Form.Group> : <></>}
                </div>
            </Collapse>
        </div>
    </>
}

export default ConfigurationField