import { Component } from "react";
import { Button, Form } from "react-bootstrap";
import { Formik } from "formik";

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
    form_config: {[k: string]: {name: string, config: FieldConfigType}}
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
        this.state = {form_config: form_config};
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
                    {Object.entries(this.state.form_config).map(([fieldKey, {name, config}]) => {
                        return <ConfigurationField
                            key={fieldKey}
                            fieldName={name}
                            fieldConfig={config}
                        ></ConfigurationField>
                    })}
                </Form>
            )}
            </Formik>
            <Button onClick={() => {
                let form_config = this.state.form_config;
                form_config[Math.random().toString(36).substring(7)] = {name: '', config: {type: ''}};
                this.setState({form_config: form_config});
            }}>Add new field</Button>
        </>
    }

}

export default Configuration