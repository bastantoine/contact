import { Component } from "react";
import { Button, ButtonGroup, Form } from "react-bootstrap";
import { Formik } from "formik";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import { ConfigType, FieldConfigType } from "../Home";
import ConfigurationField from "./ConfigurationField";

type PropsType = {
    config: {
        main_attributes: string[],
        attributes: string[],
        primary_key: string,
        raw_config: ConfigType,
    },
}
type StateType = {
    form_config: {[k: string]: {name: string, config: FieldConfigType}},
    fields: string[],
}

class Configuration extends Component<PropsType, StateType> {

    constructor(props: PropsType) {
        super(props)
        // Reformat a bit the config object: the key is used as the key of the child
        // Component, this way when we add a new field, we set its key to a random
        // string, and a blank name, so that a blank name is displayed, but each
        // child component still has a unique key.
        let form_config: {[k: string]: {name: string, config: FieldConfigType}} = {};
        for (let [fieldName, fieldConfig] of Object.entries(this.props.config.raw_config))
            form_config[fieldName] = {name: fieldName, config: fieldConfig};
        this.state = {
            form_config: form_config,
            fields: Object.keys(form_config),
        };
    }

    render() {
        return <>
            <Formik
                initialValues={{}}
                onSubmit={(values) => {
                    console.log(values);
                }}
            >
            {/* Callback function containing Formik state and helpers that handle common form actions */}
            {({ handleSubmit}) => (
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
                                        const {name, config} = this.state.form_config[fieldKey];
                                        return <Draggable key={fieldKey} draggableId={fieldKey} index={index}>
                                            {(provided) => (
                                                <div
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    ref={provided.innerRef}
                                                >
                                                    <ConfigurationField
                                                        fieldKey={fieldKey}
                                                        fieldName={name}
                                                        fieldConfig={config}
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
                            let form_config = this.state.form_config;
                            let fields = this.state.fields;
                            let new_field_key = Math.random().toString(36).substring(7);
                            fields.push(new_field_key);
                            form_config[new_field_key] = {name: '', config: {type: ''}};
                            this.setState({form_config: form_config, fields: fields});
                        }}>Add new field</Button>
                        <Button type="submit" variant="success">Save configuration</Button>
                    </ButtonGroup>
                </Form>
            )}
            </Formik>
        </>
    }

}

export default Configuration