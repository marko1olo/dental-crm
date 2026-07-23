import type { ByteArray } from 'dicom-parser';
declare function unpackBinaryFrame(byteArray: ByteArray, frameOffset: number, pixelsPerFrame: number): Uint8Array;
export default unpackBinaryFrame;
