function getValue(element, index, defaultValue) {
    index = index || 0;
    if (!element) {
        return defaultValue;
    }
    if (!element.Value) {
        return defaultValue;
    }
    if (Array.isArray(element.Value) && element.Value.length <= index) {
        return defaultValue;
    }
    return element.Value[index];
}
export default getValue;
