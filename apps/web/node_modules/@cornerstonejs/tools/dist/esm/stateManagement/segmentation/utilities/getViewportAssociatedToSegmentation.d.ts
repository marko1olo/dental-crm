import type { Types } from '@cornerstonejs/core';
import type { ContourSegmentationAnnotation } from '../../../types';
export declare function getViewportsAssociatedToSegmentation(segmentationId: string): Types.IViewport[];
export declare function getViewportAssociatedToSegmentation(segmentationId: string): import("@cornerstonejs/core").Viewport;
export declare function getViewportWithMatchingViewPlaneNormal(viewports: Types.IViewport[], annotation: ContourSegmentationAnnotation, dotThreshold?: number): Types.IViewport | undefined;
