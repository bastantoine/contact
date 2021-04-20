import React, { useState } from "react";
import { Button, ButtonGroup, Col, Form, Row } from "react-bootstrap";

import { ATTRIBUTE_TYPE_COMPONENT_MAPPING } from "../TypeComponents";

type PropsType = {}

const fieldDivStyle = {
    border: '1px solid lightgray',
    borderRadius: '10px',
    paddingTop: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
    marginBottom: '16px',
}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ConfigurationField(props: PropsType & { children?: React.ReactNode}) {
    const [isButtonDisplayedNameDisplayed, setIsButtonDisplayedNameDisplayed] = useState(false);
    const [isButtonFormHelpTextDisplayed, setIsButtonFormHelpTextDisplayed] = useState(false);
    const [isButtonMainAttributeDisplayed, setIsButtonMainAttributeDisplayed] = useState(false);
    const [isButtonSortKeyDisplated, setIsButtonSortKeyDisplated] = useState(false);
    return <div style={fieldDivStyle}>
        <Form.Group as={Row}>
            <Form.Label column xl={3}>
                Name
            </Form.Label>
            <Col xl={9}>
                <Form.Control type="text" placeholder="Name" required />
            </Col>
        </Form.Group>
        <Form.Group as={Row}>
            <Form.Label column xl={3}>
                Type
            </Form.Label>
            <Col xl={9}>
                <Form.Control as="select" defaultValue="Choose type..." required>
                    <option>Choose type...</option>
                    {Object.keys(ATTRIBUTE_TYPE_COMPONENT_MAPPING).map((type) => <option key={type}>{type}</option>)}
                </Form.Control>
            </Col>
        </Form.Group>
        <Form.Group as={Row}>
            <Form.Label column xl={3}></Form.Label>
            <Col xl={9}>
                <Form.Row>
                    <Form.Check type="checkbox" label="Required" />
                    <Form.Check type="checkbox" label="Primary key" style={{marginLeft: '10px'}} />
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
        {isButtonDisplayedNameDisplayed ?<Form.Group as={Row}>
            <Form.Label column xl={3}>
                Display name
            </Form.Label>
            <Col xl={9}>
                <Form.Control type="text" placeholder="Display name" />
            </Col>
        </Form.Group> : <></>}
        {isButtonFormHelpTextDisplayed ?<Form.Group as={Row}>
            <Form.Label column xl={3}>
                Form help text
            </Form.Label>
            <Col xl={9}>
                <Form.Control type="text" placeholder="Form help text" />
            </Col>
        </Form.Group> : <></>}
        {isButtonMainAttributeDisplayed ?<Form.Group as={Row}>
            <Form.Label column xl={3}>
                Main attribute value
            </Form.Label>
            <Col xl={9}>
                <Form.Control type="text" placeholder="Main attribute value" />
            </Col>
        </Form.Group> : <></>}
        {isButtonSortKeyDisplated ?<Form.Group as={Row}>
            <Form.Label column xl={3}>
                Sort key value
            </Form.Label>
            <Col xl={9}>
                <Form.Control type="text" placeholder="Sort key value" />
            </Col>
        </Form.Group> : <></>}
    </div>
}

export default ConfigurationField