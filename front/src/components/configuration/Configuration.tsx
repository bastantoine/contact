import $ from 'jquery'
import { Component } from "react";
import { Alert, Button, ButtonGroup, Form } from "react-bootstrap";
import { Formik } from "formik";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import { API_ENDPOINT } from "../../config";
import { join } from "../../utils";
import { ConfigType } from "../Home";
import ConfigurationField from "./ConfigurationField";

type PropsType = {
    config: {
        main_attributes: string[],
        attributes: string[],
        primary_key: string,
        raw_config: ConfigType,
    },
    configUpdatedHandler: ((config: {[k: string]: any}) => void)
}
type StateType = {
    form_config: {[k: string]: any},
    fields_keys_to_names: {[k: string]: string},
    fields: string[],
    error: null | JQuery.jqXHR,
}

class Configuration extends Component<PropsType, StateType> {

    constructor(props: PropsType) {
        super(props)
        // Reformat a bit the config object: 'flatten' the config by building an
        // object where the keys are '<fieldName>-<param>' and the value the
        // value of the param of the current field. This way, by using the same
        // mapping '<fieldName>-<param>' for all the input's name, formik will
        // know which value to update in case of change.
        let form_config: {[k: string]: any} = {};
        for (let [fieldName, fieldConfig] of Object.entries(this.props.config.raw_config)) {
            for (let [param, value] of Object.entries(fieldConfig))
                form_config[`${fieldName}-${param}`] = value;
        }
        this.state = {
            error: null,
            form_config: form_config,
            // Mapping of the field keys and field names. The field key is used
            // only internally by react, while the field name is the name used
            // in the server side config and displayed. In case of the field
            // already created in the config on load, fieldKey == fieldName. In
            // case of newly created fields, fieldKey = <random string>,
            // fieldName = ''.
            fields_keys_to_names: {},
            fields: Object.keys(this.props.config.raw_config),
        };
    }

    render() {
        return <>
            <Formik
                initialValues={this.state.form_config}
                onSubmit={(values, {setSubmitting, resetForm}) => {
                    setSubmitting(true);
                    let formattedConfig: {[k: string]: {[k: string]: any}} = {};
                    for (let fieldKey of this.state.fields) {
                        let fieldValues = Object.fromEntries(
                            Object.entries(values)
                            .filter(([k, _]) => k.startsWith(fieldKey))
                            .map(([k, v]) => [k.replace(`${fieldKey}-`, ''), v])
                        )
                        let fieldName = fieldValues.name || fieldKey;
                        if (fieldValues.name) delete fieldValues.name;
                        for(let param of Object.keys(fieldValues)) {
                            if (param === 'required' || param === 'primary_key')
                                fieldValues[param] = fieldValues[param] !== []
                        }
                        formattedConfig[fieldName] = fieldValues;
                    }
                    $.ajax({
                        url: join(API_ENDPOINT, 'config'),
                        method: 'PUT',
                        data: JSON.stringify(formattedConfig),
                        contentType: 'application/json'
                    })
                        .fail((error) => this.setState({error: error}))
                        .done(() => {this.props.configUpdatedHandler(formattedConfig); resetForm();})
                        .always(() => setSubmitting(false));
                }}
                enableReinitialize
            >
            {/* Callback function containing Formik state and helpers that handle common form actions */}
            {({ handleSubmit,
                handleChange,
                handleBlur,
                values,
                isSubmitting}) => (
                // We need the noValidate so that the browser will not try to
                // valide the inputs and won't display any error message that
                // would mess up with the validation we already have.
                <Form onSubmit={handleSubmit} noValidate>
                    <DragDropContext onDragEnd={(result) => {
                        // Don't do anything if the field has been dropped
                        // outside of the droppable zone
                        if (!result.destination) return;
                        let from = result.source.index;
                        let to = result.destination?.index;
                        function array_move(arr: any[], from: number, to: number) {
                            // Helper to move an element of an array from 'from' to 'to'
                            // From https://stackoverflow.com/a/5306832
                            if (to >= arr.length) {
                                var k = to - arr.length + 1;
                                while (k--) arr.push(undefined);
                            }
                            arr.splice(to, 0, arr.splice(from, 1)[0]);
                            return arr;
                        };
                        this.setState({fields: array_move(this.state.fields, from, to)})
                    }}>
                        <Droppable droppableId="config-form-fields">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {this.state.fields.map((fieldKey, index) => {
                                        // Build an object with only the values
                                        // related to this field, ie. whose key
                                        // starts with the fieldKey
                                        const config = Object.fromEntries(
                                            Object.entries(values)
                                                  .filter(([k, _]) => k.startsWith(fieldKey))
                                                  .map(([k, v]) => [k.replace(`${fieldKey}-`, ''), v])
                                        );
                                        const fieldName = this.state.fields_keys_to_names[fieldKey] !== undefined ?
                                                          this.state.fields_keys_to_names[fieldKey] :
                                                          fieldKey
                                        return <Draggable key={fieldKey} draggableId={fieldKey} index={index}>
                                            {(provided) => (
                                                <div
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    ref={provided.innerRef}
                                                >
                                                    <ConfigurationField
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        fieldKey={fieldKey}
                                                        fieldName={fieldName}
                                                        fieldConfig={config}
                                                        deleteFieldHandler={(fieldKey: string) => this.setState({fields: this.state.fields.filter((k) => k !== fieldKey)})}
                                                    ></ConfigurationField>
                                                </div>
                                            )}
                                        </Draggable>
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                    <ButtonGroup>
                        <Button onClick={() => {
                            let {fields, fields_keys_to_names} = this.state;

                            // Use a random string as the key, but keep a blank name
                            let new_field_key = Math.random().toString(36).substring(7);
                            fields.push(new_field_key);
                            fields_keys_to_names[new_field_key] = '';
                            this.setState({fields: fields, fields_keys_to_names: fields_keys_to_names});
                        }}>Add new field</Button>
                        <Button type="submit" variant="success" disabled={isSubmitting}>Save configuration</Button>
                    </ButtonGroup>
                </Form>
            )}
            </Formik>
            {this.state.error ?
            <Alert variant={"danger"} style={{marginTop: '16px'}}>
                There has been an error while submitting the form. Please retry.<br/>
            </Alert> : <></>}
        </>
    }

}

export default Configuration