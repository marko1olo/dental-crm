import type { Types } from '@cornerstonejs/core';
import type { ContourSegmentationAnnotation } from '../../types/ContourSegmentationAnnotation';
export declare function contourSegmentationOperation(sourceAnnotationOrUID: ContourSegmentationAnnotation | string, targetAnnotationOrUID: ContourSegmentationAnnotation | string, viewport?: Types.IViewport, contourHoleProcessingEnabled?: boolean): Promise<void>;
