import type { Types } from '@cornerstonejs/core';
import type { ContourSegmentationAnnotation } from '../../types/ContourSegmentationAnnotation';
export declare function convertContourPolylineToCanvasSpace(polyline: Types.Point3[], viewport: Types.IViewport): Types.Point2[];
export declare function convertContourPolylineToWorld(polyline: Types.Point2[], viewport: Types.IViewport): Types.Point3[];
export declare function checkIntersection(sourcePolyline: Types.Point2[], targetPolyline: Types.Point2[]): {
    hasIntersection: boolean;
    isContourHole: boolean;
};
export declare function getContourHolesData(viewport: Types.IViewport, annotation: ContourSegmentationAnnotation): Array<{
    annotation: ContourSegmentationAnnotation;
    polyline: Types.Point2[];
}>;
export declare function createPolylineHole(viewport: Types.IViewport, targetAnnotation: ContourSegmentationAnnotation, holeAnnotation: ContourSegmentationAnnotation): void;
export declare function combinePolylines(viewport: Types.IViewport, targetAnnotation: ContourSegmentationAnnotation, targetPolyline: Types.Point2[], sourceAnnotation: ContourSegmentationAnnotation, sourcePolyline: Types.Point2[]): void;
export declare function createNewAnnotationFromPolyline(viewport: Types.IViewport, templateAnnotation: ContourSegmentationAnnotation, polyline: Types.Point2[]): ContourSegmentationAnnotation;
export declare function updateViewportsForAnnotations(viewport: Types.IViewport, annotations: ContourSegmentationAnnotation[]): void;
export declare function removeDuplicatePoints(polyline: Types.Point2[]): Types.Point2[];
export declare function cleanupPolylines(polylines: Types.Point2[][]): Types.Point2[][];
