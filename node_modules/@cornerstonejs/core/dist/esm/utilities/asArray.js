export function asArray(item) {
    if (Array.isArray(item)) {
        return item;
    }
    return [item];
}
