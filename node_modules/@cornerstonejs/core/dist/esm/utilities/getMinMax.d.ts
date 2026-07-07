import type { PixelDataTypedArray } from '../types/PixelDataTypedArray';
export default function getMinMax(storedPixelData: PixelDataTypedArray): {
    min: number;
    max: number;
};
