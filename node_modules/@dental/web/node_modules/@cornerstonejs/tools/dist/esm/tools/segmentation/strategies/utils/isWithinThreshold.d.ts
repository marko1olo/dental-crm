import type { Types } from '@cornerstonejs/core';
declare function isWithinThreshold(index: number, imageScalarData: Types.PixelDataTypedArray, threshold: {
    range: number[];
}): boolean;
export default isWithinThreshold;
