/**
 * Helper function used to join a list of path together using a '/' to build a full URI.
 *
 * The function makes sure that there's no double '/' one after the other, so it
 * is safe to include a trailing '/' in one the paths provided, or even a '/'
 *
 * This functions is shamelessly taken from the os.path.join function of Python,
 * which does the same, but for file paths ({@link https://github.com/python/cpython/blob/3.9/Lib/posixpath.py#L71}).
 * @param p First path to joins
 * @param paths List of paths to append one after the other
 * @returns All the single paths appended together with a '/' between each
 */
export function join(p: string, ...paths: string[]): string {
    const sep = "/";
    let output = p;
    for (const path of paths) {
        if (path !== sep) {
            if (path.startsWith(sep)) {
                output += path;
            } else {
                output += sep + path;
            }
        }
    }
    return output;
}

export function upperFirstLetter(input: string): string {
    return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
}

export function getValueForToggle(
    value: boolean,
    value_true: string | undefined,
    value_false: string | undefined
): string {
    return {value_true: value_true || "Yes", value_false: value_false || "No"}[
        value ? "value_true" : "value_false"
    ];
}

export function getRandomString(): string {
    return Math.random().toString(36).substring(7);
}

export function fetchOrThrow(
    input: RequestInfo,
    init?: RequestInit
): Promise<any> {
    return fetch(input, init).then((response) => {
        if (!response.ok) {
            throw new APIError(
                response,
                `Error ${response.status}: ${response.statusText}`
            );
        }
        return response;
    });
}

export function fetchJsonOrThrow(
    input: RequestInfo,
    init?: RequestInit
): Promise<any> {
    return fetch(input, init).then((response) => {
        if (!response.ok) {
            throw new APIError(
                response,
                `Error ${response.status}: ${response.statusText}`
            );
        }
        return response.json();
    });
}

export class APIError extends Error {
    response: Response;
    constructor(response: Response, ...params: any[]) {
        super(...params);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
        this.name = "APIError";
        this.response = response;
    }
}

// Deep copy helper in vanilla TS. From https://stackoverflow.com/a/28152032/
// eslint-disable-next-line @typescript-eslint/ban-types
export function deepCopy<T extends Object>(obj: T): T {
    let copy: any;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (let i = 0, len = obj.length; i < len; i++) {
            copy[i] = deepCopy(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (const attr in obj) {
            // eslint-disable-next-line no-prototype-builtins
            if (obj.hasOwnProperty(attr)) copy[attr] = deepCopy(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}
