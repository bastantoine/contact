import React, { useState } from "react";
import { Button, ButtonGroup, Col, Collapse, Form, Row } from "react-bootstrap";
import { ATTRIBUTE_TYPE_COMPONENT_MAPPING, LIST_ALLOWED_INNER_TYPES } from "../TypeComponents";
import './ConfigurationField.css'

type PropsType = {
    fieldKey: string,
    fieldName: string,
    fieldConfig: {[k: string]: any},
    onChange: {
        (e: React.ChangeEvent<any>): void;
        <T = string | React.ChangeEvent<any>>(field: T): T extends React.ChangeEvent<any> ? void : (e: string | React.ChangeEvent<any>) => void;
    },
    onBlur: {
        (e: React.FocusEvent<any>): void;
        <T = any>(fieldOrEvent: T): T extends string ? (e: any) => void : void;
    },
    deleteFieldHandler: ((fieldKey: string) => void),
    errorsFields: string[],
}

function getFieldTitle(fieldName: string, displayName: string): JSX.Element {
    if (fieldName && displayName) {
        return <>{displayName}&nbsp;<i>({fieldName})</i></>;
    } else if (fieldName) {
        return <>{fieldName}</>;
    } else if (displayName) {
        return <>{displayName}</>;
    } else {
        return <i>&lt; New field &gt;</i>;
    }
}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ConfigurationField(props: PropsType & { children?: React.ReactNode}) {
    const [isButtonDisplayedNameDisplayed, setIsButtonDisplayedNameDisplayed] = useState(
        props.fieldConfig.display_name !== undefined ||
        props.errorsFields.includes(`${props.fieldKey}-display_name`)
    );
    const [isButtonFormHelpTextDisplayed, setIsButtonFormHelpTextDisplayed] = useState(
        props.fieldConfig.form_help_text !== undefined ||
        props.errorsFields.includes(`${props.fieldKey}-form_help_text`)
    );
    const [isButtonMainAttributeDisplayed, setIsButtonMainAttributeDisplayed] = useState(
        props.fieldConfig.main_attribute !== undefined ||
        props.errorsFields.includes(`${props.fieldKey}-main_attribute`)
    );
    const [isButtonSortKeyDisplated, setIsButtonSortKeyDisplated] = useState(
        props.fieldConfig.sort_key !== undefined ||
        props.errorsFields.includes(`${props.fieldKey}-sort_key`)
    );
    const [open, setOpen] = useState(false);

    const [fieldNameHook, setFieldNameHook] = useState(props.fieldName);
    const [displayNameHook, setDisplayNameHook] = useState(props.fieldConfig.display_name);
    const [typeHook, setTypeHook] = useState(props.fieldConfig.type)

    return <>
        <div className={`field-configuration-form ${props.errorsFields.length > 0 ? "field-configuration-form-with-errors" : ''}`}>
            <div
                onClick={() => setOpen(!open)}
                aria-controls={`config-form-field-${props.fieldName}`}
                aria-expanded={open}
                className="field-configuration-name-title"
            >
                <span className="field-configuration-name-title-value">{getFieldTitle(fieldNameHook, displayNameHook)}</span>
            </div>
            <Collapse in={open}>
                <div id={`config-form-field-${props.fieldName}`}>
                <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Name
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control
                            type="text"
                            placeholder="Name"
                            defaultValue={props.fieldName}
                            onChange={(event) => {setFieldNameHook(event.target.value); props.onChange(event)}}
                            onBlur={props.onBlur}
                            name={`${props.fieldKey}-name`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-name`)}
                            required
                        />
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Type
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control
                            as="select"
                            defaultValue={Object.keys(ATTRIBUTE_TYPE_COMPONENT_MAPPING).includes(String(props.fieldConfig.type)) ? props.fieldConfig.type : "Choose type..."}
                            onChange={(event) => {setTypeHook(event.target.value); props.onChange(event)}}
                            onBlur={props.onBlur}
                            name={`${props.fieldKey}-type`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-type`)}
                            required
                        >
                            <option>Choose type...</option>
                            {Object.keys(ATTRIBUTE_TYPE_COMPONENT_MAPPING).map((type) => <option key={type}>{type}</option>)}
                        </Form.Control>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column xl={3}></Form.Label>
                    <Col xl={9}>
                        <Form.Row>
                            <Form.Check
                                type="checkbox"
                                label="Required"
                                defaultChecked={props.fieldConfig.required === true ? true : undefined}
                                onChange={props.onChange}
                                onBlur={props.onBlur}
                                name={`${props.fieldKey}-required`}
                                isInvalid={props.errorsFields.includes(`${props.fieldKey}-required`)}
                            />
                            <Form.Check
                                type="checkbox"
                                label="Primary key"
                                defaultChecked={props.fieldConfig.primary_key === true ? true : undefined}
                                style={{marginLeft: '10px'}}
                                onChange={props.onChange}
                                onBlur={props.onBlur}
                                name={`${props.fieldKey}-primary_key`}
                                isInvalid={props.errorsFields.includes(`${props.fieldKey}-primary_key`)}
                            />
                        </Form.Row>
                    </Col>
                </Form.Group>
                {typeHook === 'list' ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Inner type
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control
                            as="select"
                            defaultValue={props.fieldConfig.additional_type_parameters ? (
                                            LIST_ALLOWED_INNER_TYPES.includes(props.fieldConfig.additional_type_parameters.inner_type) ?
                                            props.fieldConfig.additional_type_parameters.inner_type :
                                            "Choose type..."
                                          ) : undefined
                                        }
                            onChange={props.onChange}
                            onBlur={props.onBlur}
                            name={`${props.fieldKey}-inner_type`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-inner_type`)}
                            required
                        >
                            <option>Choose type...</option>
                            {LIST_ALLOWED_INNER_TYPES.map((type) => <option key={type}>{type}</option>)}
                        </Form.Control>
                    </Col>
                </Form.Group> : <></>}
                {typeHook === 'image' ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Accepted types
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control
                            type="text"
                            placeholder="Accepted types"
                            defaultValue={props.fieldConfig.additional_type_parameters ?
                                          props.fieldConfig.additional_type_parameters.accepted_types :
                                          undefined
                                        }
                            onChange={props.onChange}
                            onBlur={props.onBlur}
                            name={`${props.fieldKey}-accepted_types`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-accepted_types`)}
                            required
                        />
                        <Form.Text muted>Enter the format of images that should be accepted, by separating them with a comma. Ex: 'png, jpg, jpeg'</Form.Text>
                    </Col>
                </Form.Group> : <></>}
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
                        <Form.Control
                            type="text"
                            placeholder="Display name"
                            defaultValue={props.fieldConfig.display_name}
                            onBlur={props.onBlur}
                            onChange={(event) => {setDisplayNameHook(event.target.value); props.onChange(event)}}
                            name={`${props.fieldKey}-display_name`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-display_name`)}
                        />
                    </Col>
                </Form.Group> : <></>}
                {isButtonFormHelpTextDisplayed ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Form help text
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control
                            type="text"
                            placeholder="Form help text"
                            defaultValue={props.fieldConfig.form_help_text}
                            onChange={props.onChange}
                            onBlur={props.onBlur}
                            name={`${props.fieldKey}-form_help_text`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-form_help_text`)}
                        />
                    </Col>
                </Form.Group> : <></>}
                {isButtonMainAttributeDisplayed ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Main attribute value
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control
                            type="text"
                            placeholder="Main attribute value"
                            defaultValue={props.fieldConfig.main_attribute}
                            onChange={props.onChange}
                            onBlur={props.onBlur}
                            name={`${props.fieldKey}-main_attribute`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-main_attribute`)}
                        />
                    </Col>
                </Form.Group> : <></>}
                {isButtonSortKeyDisplated ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Sort key value
                    </Form.Label>
                    <Col xl={9}>
                        <Form.Control
                            type="text"
                            placeholder="Sort key value"
                            defaultValue={props.fieldConfig.sort_key}
                            onChange={props.onChange}
                            onBlur={props.onBlur}
                            name={`${props.fieldKey}-sort_key`}
                            isInvalid={props.errorsFields.includes(`${props.fieldKey}-sort_key`)}
                        />
                    </Col>
                </Form.Group> : <></>}
                <Row>
                    <Col xl={{offset: 9, span: 3}}>
                        <Button
                            variant="danger"
                            className="button-delete-field"
                            onClick={() => props.deleteFieldHandler(props.fieldKey)}
                        >
                            Delete the field
                        </Button>
                    </Col>
                </Row>
                </div>
            </Collapse>
        </div>
    </>
}

export default ConfigurationField