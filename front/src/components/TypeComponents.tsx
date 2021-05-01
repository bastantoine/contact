import { getValueForToggle } from "../utils";

type TypeComponentPropsType = {value: string, extra_params?: any}

export function TextComponent(props: TypeComponentPropsType) {
    return <>{props.value}</>
}

export function ListComponent(props: {value: string[], extra_params: {inner_type: keyof typeof _ATTRIBUTE_TYPE_COMPONENT_MAPPING}}) {
    if (props.value) {
        // This weird syntax tells the TS compiler that the allowed
        // types are the keys of _ATTRIBUTE_TYPE_COMPONENT_MAPPING
        // From https://stackoverflow.com/a/57088282/
        let attribute_type: keyof typeof _ATTRIBUTE_TYPE_COMPONENT_MAPPING = props.extra_params.inner_type;
        let ComponentToUse = _ATTRIBUTE_TYPE_COMPONENT_MAPPING[attribute_type] || TextComponent;
        // The trick we use in the next line works with values.length >= 2, so
        // we need to cvoer the case of no elements or a single element before
        if (props.value.length === 0) {
            return <></>
        }
        if (props.value.length === 1) {
            return <ComponentToUse value={props.value[0]}></ComponentToUse>
        }
        // Little trick to join a list of JSX elements. From https://stackoverflow.com/a/40788571/
        return <>{props.value.map<React.ReactNode>((val, i) => <ComponentToUse value={val} key={i}></ComponentToUse>).reduce((prev, curr) => [prev, ', ', curr])}</>
    }
    return <></>
}

export function ImageComponent(props: TypeComponentPropsType) {
    return <img src={props.value} alt=""/>
}

function BaseUrlComponent(props: {link: string, value: string}) {
    return <a href={props.link}>{props.value}</a>
}

export function UrlComponent(props: TypeComponentPropsType) {

    function stripHTTP(url: string): string {
        if (url.startsWith('https://'))
            return url.slice(8);
        if (url.startsWith('http://'))
            return url.slice(7);
        return url;
    }

    return <BaseUrlComponent link={props.value} value={stripHTTP(props.value)}></BaseUrlComponent>
}

export function EmailComponent(props: TypeComponentPropsType) {
    return <BaseUrlComponent link={`mailto:${props.value}`} value={props.value}></BaseUrlComponent>
}

export function ToggleComponent(props: {value: string, extra_params?: {value_true: string, value_false: string}}) {
    return <TextComponent value={getValueForToggle(
        Boolean(props.value),
        props.extra_params ? props.extra_params.value_true : undefined,
        props.extra_params ? props.extra_params.value_false : undefined
    )}></TextComponent>
}

// Only used internally, note it does not include the binding for the list type.
// This way we are safe to use this list to build the inner components inside a
// ListComponent.
const _ATTRIBUTE_TYPE_COMPONENT_MAPPING = {
    integer: TextComponent,
    str: TextComponent,
    image: ImageComponent,
    long_str: TextComponent,
    url: UrlComponent,
    email: EmailComponent,
    toggle: ToggleComponent,
}


// {[k: string]: any} is a little trick that allow to set any key on the object
// after init. From https://stackoverflow.com/a/44441178/
export const ATTRIBUTE_TYPE_COMPONENT_MAPPING: {[k: string]: any} = Object.assign({}, _ATTRIBUTE_TYPE_COMPONENT_MAPPING)
ATTRIBUTE_TYPE_COMPONENT_MAPPING.list =  ListComponent
export type ALLOWED_TYPES = keyof typeof ATTRIBUTE_TYPE_COMPONENT_MAPPING
export const FILE_FIELDS = [
    'image',
]
export const LIST_ALLOWED_INNER_TYPES = [
    'integer',
    'str',
    'url',
    'email',
] as const
// const assertions
// https://blog.logrocket.com/const-assertions-are-the-killer-new-typescript-feature-b73451f35802/
