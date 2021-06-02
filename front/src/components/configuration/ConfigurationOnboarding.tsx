import React from "react";

type PropsType = {}

// We have to add the property children, otherwise we have an error "Property
// 'children' does not exist on type 'IntrinsicAttributes & PropsType'"
function ConfigurationOnboarding(props: PropsType & { children?: React.ReactNode}) {

    return <>
        Looks like you don't have a configuration set...
    </>
}

export default ConfigurationOnboarding