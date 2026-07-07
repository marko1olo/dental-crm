import type { Types } from '@cornerstonejs/core';
type Options = {
    viewport?: Types.IViewport;
    searchRadius?: number;
};
export declare function getSegmentIndexAtLabelmapBorder(segmentationId: string, worldPoint: Types.Point3, { viewport, searchRadius }: Options): number;
export {};
