import React from "react";
import Configuration from "./Configuration";

type PropsType = {
    configUpdatedHandler: ((config: {[k: string]: any}) => void)
}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ConfigurationOnboarding(props: PropsType & { children?: React.ReactNode}) {

    return <>
        Looks like you don't have a configuration set...<br/>
        You need one to get started.<br/>
        <br/>
        <Configuration
            config={{
                main_attributes: [],
                attributes: [],
                primary_key: "",
                raw_config: {},
            }}
            configUpdatedHandler={props.configUpdatedHandler}
        ></Configuration>
    </>
}

export default ConfigurationOnboarding