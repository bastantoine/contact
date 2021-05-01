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
export function join(p: string, ...paths: string[]) {
    let sep = '/';
    let output = p;
    for(let path of paths) {
        if (path !== sep) {
            if (path.startsWith(sep)) {
                output += path
            } else {
                output += sep + path
            }
        }
    }
    return output
}

export function upperFirstLetter(input: string): string {
    return input ? input.charAt(0).toUpperCase() + input.slice(1) : input;
}

export function getValueForToggle(value: boolean, value_true: string|undefined, value_false: string|undefined): string {
    return {value_true: value_true || 'Yes', value_false: value_false || 'No'}[value ? 'value_true' : 'value_false']
}
