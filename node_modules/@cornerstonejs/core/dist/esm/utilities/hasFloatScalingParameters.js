export const hasFloatScalingParameters = (scalingParameters) => {
    const hasFloatRescale = Object.values(scalingParameters).some((value) => typeof value === 'number' && !Number.isInteger(value));
    return hasFloatRescale;
};
