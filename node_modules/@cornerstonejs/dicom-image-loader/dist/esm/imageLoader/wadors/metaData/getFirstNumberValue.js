import getNumberValues from './getNumberValues';
function getFirstNumberValue(sequence, key) {
    const values = getNumberValues(sequence[key]);
    return values ? values[0] : null;
}
export { getFirstNumberValue };
