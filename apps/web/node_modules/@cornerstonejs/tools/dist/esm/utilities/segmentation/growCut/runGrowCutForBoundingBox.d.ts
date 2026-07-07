import type { Types } from '@cornerstonejs/core';
import type { GrowCutOptions } from './runGrowCut';
type BoundingBoxInfo = {
    boundingBox: {
        ijkTopLeft: Types.Point3;
        ijkBottomRight: Types.Point3;
    };
};
type GrowCutBoundingBoxOptions = GrowCutOptions & {
    negativePixelRange?: [number, number];
    positivePixelRange?: [number, number];
};
declare function runGrowCutForBoundingBox(referencedVolumeId: string, boundingBoxInfo: BoundingBoxInfo, options?: GrowCutBoundingBoxOptions): Promise<Types.IImageVolume>;
export { runGrowCutForBoundingBox as default, runGrowCutForBoundingBox };
export type { BoundingBoxInfo, GrowCutBoundingBoxOptions };
