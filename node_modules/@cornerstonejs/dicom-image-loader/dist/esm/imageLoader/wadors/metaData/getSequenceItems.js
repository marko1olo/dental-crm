function getSequenceItems(element) {
    if (!element?.Value?.length) {
        return [];
    }
    if (!Array.isArray(element.Value)) {
        if (typeof element.Value === 'object') {
            console.warn('Warning: Value should be an array, but an object was found. Encapsulating the object in an array.');
            return [element.Value];
        }
        return [];
    }
    return element.Value;
}
export default getSequenceItems;
