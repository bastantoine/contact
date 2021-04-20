import React from "react";
import { Form } from "react-bootstrap";
import { Formik } from "formik";

import { ConfigType } from "../Home";
import ConfigurationField from "./ConfigurationField";

type PropsType = {
    config: {
        main_attributes: string[],
        attributes: string[],
        primary_key: string,
        raw_config: ConfigType,
    },
}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function Configuration(props: PropsType & { children?: React.ReactNode}) {
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
                    {props.config.attributes.map((attr) => {
                        return <ConfigurationField key={attr}></ConfigurationField>
                    })}
                </Form>
            )}
            </Formik>
        </>
}

export default Configuration