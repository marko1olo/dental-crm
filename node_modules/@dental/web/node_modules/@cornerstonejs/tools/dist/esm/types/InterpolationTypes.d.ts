import type { Types } from '@cornerstonejs/core';
import type { Annotation } from './AnnotationTypes';
import type { InterpolationROIAnnotation } from './ToolSpecificAnnotationTypes';
export type InterpolationViewportData = {
    annotation: InterpolationROIAnnotation;
    interpolationUID: string;
    viewport: Types.IViewport;
    sliceData: Types.ImageSliceData;
    isInterpolationUpdate?: boolean;
};
export type ImageInterpolationData = {
    sliceIndex: number;
    annotations?: Annotation[];
};
export type AcceptInterpolationSelector = {
    toolNames?: string[];
    segmentationId?: string;
    segmentIndex?: number;
    sliceIndex?: number;
};
