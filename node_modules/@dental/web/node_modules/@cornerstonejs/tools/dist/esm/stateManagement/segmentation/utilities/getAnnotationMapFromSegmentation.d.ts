import type { Types } from '@cornerstonejs/core';
import type * as ToolsTypes from '../../../types';
export type MapOptions = {
    segmentIndices?: number[];
    segmentationId?: string;
    viewport?: Types.IStackViewport | Types.IVolumeViewport;
};
export type AnnotationInfo = {
    polyline: Types.Point3[];
    isClosed: boolean;
    annotationUID: string;
    referencedImageId: string;
    holesPolyline: Types.Point3[][];
    holesUIDs: string[];
    holesClosed: boolean[];
};
export declare function getAnnotationMapFromSegmentation(contourRepresentationData: ToolsTypes.ContourSegmentationData, options?: MapOptions): {
    segmentIndices: number[];
    annotationUIDsInSegmentMap: Map<number, unknown>;
};
