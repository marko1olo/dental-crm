import type { Types } from '@cornerstonejs/core';
import { SegmentationRepresentations } from '../../enums';
import type { Segmentation } from '../../types';
type Options = {
    representationType?: SegmentationRepresentations;
    viewport?: Types.IViewport;
};
export declare function getSegmentIndexAtWorldPoint(segmentationId: string, worldPoint: Types.Point3, options?: Options): number;
export declare function getSegmentIndexAtWorldForLabelmap(segmentation: Segmentation, worldPoint: Types.Point3, { viewport }: Options): number | undefined;
export declare function getSegmentIndexAtWorldForContour(segmentation: Segmentation, worldPoint: Types.Point3, { viewport }: Options): number;
export {};
