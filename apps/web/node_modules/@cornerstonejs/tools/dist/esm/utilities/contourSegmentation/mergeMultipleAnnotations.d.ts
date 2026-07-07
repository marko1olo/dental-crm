import type { Types } from '@cornerstonejs/core';
import type { ContourSegmentationAnnotation } from '../../types/ContourSegmentationAnnotation';
declare function processMultipleIntersections(viewport: Types.IViewport, sourceAnnotation: ContourSegmentationAnnotation, sourcePolyline: Types.Point2[], intersectingContours: Array<{
    targetAnnotation: ContourSegmentationAnnotation;
    targetPolyline: Types.Point2[];
    isContourHole: boolean;
}>): void;
export { processMultipleIntersections };
