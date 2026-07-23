import VOILUTFunctionType from '../enums/VOILUTFunctionType';
import { logit } from './logit';
function toWindowLevel(low, high) {
    const windowWidth = Math.abs(high - low) + 1;
    const windowCenter = (low + high + 1) / 2;
    return { windowWidth, windowCenter };
}
function toLowHighRange(windowWidth, windowCenter, voiLUTFunction = VOILUTFunctionType.LINEAR) {
    if (voiLUTFunction === VOILUTFunctionType.LINEAR ||
        voiLUTFunction === VOILUTFunctionType.SAMPLED_SIGMOID) {
        return {
            lower: windowCenter - 0.5 - (windowWidth - 1) / 2,
            upper: windowCenter - 0.5 + (windowWidth - 1) / 2,
        };
    }
    else if (voiLUTFunction === VOILUTFunctionType.LINEAR_EXACT) {
        return {
            lower: windowCenter - windowWidth / 2,
            upper: windowCenter + windowWidth / 2,
        };
    }
    else {
        throw new Error('Invalid VOI LUT function');
    }
}
export { toWindowLevel, toLowHighRange };
