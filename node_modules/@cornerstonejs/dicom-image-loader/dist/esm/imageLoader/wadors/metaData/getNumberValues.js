function getNumberValues(element, minimumLength) {
    if (!element) {
        return;
    }
    if (!element.Value) {
        return;
    }
    if (!Array.isArray(element.Value)) {
        return;
    }
    if (minimumLength && element.Value.length < minimumLength) {
        return;
    }
    const values = [];
    for (let i = 0; i < element.Value.length; i++) {
        values.push(parseFloat(element.Value[i]));
    }
    return values;
}
export default getNumberValues;
