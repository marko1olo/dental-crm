import type { Types } from '@cornerstonejs/core';
declare function initLibjpegTurbo(): Promise<void>;
declare function decodeAsync(compressedImageFrame: any, imageInfo: any): Promise<Types.IImageFrame>;
declare const initialize: typeof initLibjpegTurbo;
export { initialize };
export default decodeAsync;
