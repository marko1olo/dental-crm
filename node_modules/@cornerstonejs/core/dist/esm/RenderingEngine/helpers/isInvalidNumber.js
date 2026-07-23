export const isInvalidNumber = (value) => {
    return !(typeof value === 'number' && Number.isFinite(value));
};
