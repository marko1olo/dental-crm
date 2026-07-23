import type { AABB3, PixelDataTypedArrayString } from '../types';
declare function createSubVolume(referencedVolumeId: string, boundsIJK: AABB3, options?: {
    targetBuffer?: {
        type: PixelDataTypedArrayString;
    };
}): import("..").ImageVolume;
export { createSubVolume as default, createSubVolume };
