import React, { useState } from "react";
import { Button, ButtonGroup, Col, Collapse, Form, InputGroup, Row } from "react-bootstrap";
import { getRandomString } from "../../../utils";
import { ATTRIBUTE_TYPE_COMPONENT_MAPPING, LIST_ALLOWED_INNER_TYPES } from "../../TypeComponents";
import ConfigurationFieldElement from "./ConfigurationFieldElement";
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
    setFieldValue: (field: string, value: any) => void
    deleteFieldHandler: ((fieldKey: string) => void),
    errorsFields: string[],
}
type _EventType = { target: { value: React.SetStateAction<string>; }; }

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

    // Hook array used to store the list of allowed values in case of a select.
    // In case a list is already provided, we transform it a bit, from a [value]
    // list to a [key, value] list, where initially the key and value are the
    // same. When the use wants to add new values in the form, we append to the
    // list a tuple with random key and blank value. This way if the user wants
    // to delete a entry with an empty value, we can filter on the keys, and not
    // delete the other entries with empty values.
    const [selectAllowedValuesHook, setSelectAllowedValuesHook] = useState<[string, string][]>(
        props.fieldConfig.additional_type_parameters && props.fieldConfig.additional_type_parameters.allowed_values ?
        props.fieldConfig.additional_type_parameters.allowed_values.map((val: string) => [val, val]) :
        [[getRandomString(), '']]
    );
    // Hook array used to track which values of the allowed value in case of a
    // select are not meant to be submitted and saved to the server config.
    const [deletedSelectAllowedValuesHook, setDeletedSelectAllowedValuesHook] = useState<string[]>([]);

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
                <ConfigurationFieldElement.Name
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    onChange={((event: _EventType) => {setFieldNameHook(event.target.value); props.onChange(event)})}
                    onBlur={props.onBlur}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-name`)}
                />
                <ConfigurationFieldElement.Type
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    defaultValue={Object.keys(ATTRIBUTE_TYPE_COMPONENT_MAPPING).includes(String(props.fieldConfig.type)) ? props.fieldConfig.type : "Choose type..."}
                    onChange={(event: _EventType) => {setTypeHook(event.target.value); props.onChange(event)}}
                    onBlur={props.onBlur}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-type`)}
                >
                    <option>Choose type...</option>
                    {Object.keys(ATTRIBUTE_TYPE_COMPONENT_MAPPING).map((type) => <option key={type}>{type}</option>)}
                </ConfigurationFieldElement.Type>
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
                {typeHook === 'list' ? <ConfigurationFieldElement.InnerType
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    defaultValue={props.fieldConfig.additional_type_parameters ? (
                                    LIST_ALLOWED_INNER_TYPES.includes(props.fieldConfig.additional_type_parameters.inner_type) ?
                                    props.fieldConfig.additional_type_parameters.inner_type :
                                    "Choose type..."
                                    ) : undefined
                                }
                    onChange={props.onChange}
                    onBlur={props.onBlur}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-inner_type`)}
                >
                    <option>Choose type...</option>
                    {LIST_ALLOWED_INNER_TYPES.map((type) => <option key={type}>{type}</option>)}
                </ConfigurationFieldElement.InnerType> : <></>}
                {typeHook === 'image' ? <ConfigurationFieldElement.AcceptedTypes
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    formText="Enter the format of images that should be accepted, by separating them with a comma. Ex: 'png, jpg, jpeg'"
                    defaultValue={props.fieldConfig.additional_type_parameters ?
                                    props.fieldConfig.additional_type_parameters.accepted_types :
                                    undefined
                                }
                    onChange={props.onChange}
                    onBlur={props.onBlur}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-accepted_types`)}
                /> : <></>}
                {typeHook === 'toggle' ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Displayed values
                    </Form.Label>
                    <Col xl={9}>
                        <Row>
                            <Col xl={6} className="toggle-field-display-value-true">
                                <Form.Control
                                    type="text"
                                    placeholder="True"
                                    defaultValue={props.fieldConfig.additional_type_parameters ?
                                                props.fieldConfig.additional_type_parameters.value_true :
                                                undefined
                                                }
                                    onChange={props.onChange}
                                    onBlur={props.onBlur}
                                    name={`${props.fieldKey}-value_true`}
                                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-value_true`)}
                                    required
                                />
                            </Col>
                            <Col xl={6} className="toggle-field-display-value-false">
                                <Form.Control
                                    type="text"
                                    placeholder="False"
                                    defaultValue={props.fieldConfig.additional_type_parameters ?
                                                props.fieldConfig.additional_type_parameters.value_false :
                                                undefined
                                                }
                                    onChange={props.onChange}
                                    onBlur={props.onBlur}
                                    name={`${props.fieldKey}-value_false`}
                                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-value_false`)}
                                    required
                                />
                            </Col>
                        </Row>
                        <Form.Text muted>Enter the values to use as display for the True and False states. Otherwise <i>'Yes'</i> and <i>'No'</i> will be used for True and False, respectively.</Form.Text>
                    </Col>
                </Form.Group> : <></>}
                {typeHook === 'select' ? <Form.Group as={Row}>
                    <Form.Label column xl={3}>
                        Displayed values
                    </Form.Label>
                    <Col xl={9}>
                        {selectAllowedValuesHook.map(([key, value]: [string, string]) => {
                            let fieldName = `${props.fieldKey}-allowed_values-${key}`
                            return <InputGroup style={{marginBottom: '5px'}} key={key} hidden={deletedSelectAllowedValuesHook.includes(key) ? true : undefined}>
                                <Form.Control
                                    type="text"
                                    placeholder="Value"
                                    defaultValue={value}
                                    onChange={props.onChange}
                                    onBlur={props.onBlur}
                                    name={fieldName}
                                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-allowed_values`)}
                                />
                                <InputGroup.Append>
                                    <Button
                                        variant="danger"
                                        onClick={() => {
                                            setDeletedSelectAllowedValuesHook([...deletedSelectAllowedValuesHook, key]);
                                            props.setFieldValue(`${fieldName}_deleted`, key)
                                        }}
                                    >X</Button>
                                </InputGroup.Append>
                            </InputGroup>
                        })}
                        <Form.Text muted>Enter the values that will be available in the select.</Form.Text>
                        <Row>
                            <Col xl={{offset: 8, span: 4}}>
                                <Button
                                    className="button-full-width"
                                    // Use a random key, so that we can remove only this entry, even if the value is empty
                                    onClick={() => setSelectAllowedValuesHook([...selectAllowedValuesHook, [getRandomString(), '']])}
                                >
                                    Add a value
                                </Button>
                            </Col>
                        </Row>
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
                {isButtonDisplayedNameDisplayed ? <ConfigurationFieldElement.DisplayName
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    defaultValue={props.fieldConfig.display_name}
                    onBlur={props.onBlur}
                    onChange={(event) => {setDisplayNameHook(event.target.value); props.onChange(event)}}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-display_name`)}
                /> : <></>}
                {isButtonFormHelpTextDisplayed ? <ConfigurationFieldElement.FormHelpText
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    defaultValue={props.fieldConfig.form_help_text}
                    onChange={props.onChange}
                    onBlur={props.onBlur}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-form_help_text`)}
                /> : <></>}
                {isButtonMainAttributeDisplayed ? <ConfigurationFieldElement.MainAttribute
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    defaultValue={props.fieldConfig.main_attribute}
                    onChange={props.onChange}
                    onBlur={props.onBlur}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-main_attribute`)}
                /> : <></>}
                {isButtonSortKeyDisplated ? <ConfigurationFieldElement.SortKey
                    fieldKey={props.fieldKey}
                    fieldName={props.fieldName}
                    defaultValue={props.fieldConfig.sort_key}
                    onChange={props.onChange}
                    onBlur={props.onBlur}
                    isInvalid={props.errorsFields.includes(`${props.fieldKey}-sort_key`)}
                /> : <></>}
                <Row>
                    <Col xl={{offset: 9, span: 3}}>
                        <Button
                            variant="danger"
                            className="button-full-width"
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