import type { Types } from '@cornerstonejs/core';
import type { ContourSegmentationAnnotation } from '../../types/ContourSegmentationAnnotation';
declare function findAllIntersectingContours(viewport: Types.IViewport, sourcePolyline: Types.Point2[], contourSegmentationAnnotations: ContourSegmentationAnnotation[]): Array<{
    targetAnnotation: ContourSegmentationAnnotation;
    targetPolyline: Types.Point2[];
    isContourHole: boolean;
}>;
export { findAllIntersectingContours };
