import type { PixelDataTypedArray, PixelDataTypedArrayString } from '../types';
declare function getConstructorFromType(bufferType: PixelDataTypedArrayString, isVolumeBuffer: boolean): new (length: number) => PixelDataTypedArray;
declare function getBufferConfiguration(targetBufferType: PixelDataTypedArrayString, length: number, options?: {
    isVolumeBuffer?: boolean;
}): {
    numBytes: number;
    TypedArrayConstructor: new (length: number) => PixelDataTypedArray;
};
export { getBufferConfiguration, getConstructorFromType };
