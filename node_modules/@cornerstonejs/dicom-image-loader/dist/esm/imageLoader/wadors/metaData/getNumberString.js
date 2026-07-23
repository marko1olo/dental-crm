import getValue from './getValue';
function getNumberString(element, index, defaultValue) {
    const value = getValue(element, index, defaultValue);
    if (value === undefined) {
        return;
    }
    return parseFloat(String(value));
}
export default getNumberString;
