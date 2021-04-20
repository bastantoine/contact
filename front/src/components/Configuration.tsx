import React from "react";

import { ConfigType } from "./Home";

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
    return <>Configuration</>
}

export default Configuration