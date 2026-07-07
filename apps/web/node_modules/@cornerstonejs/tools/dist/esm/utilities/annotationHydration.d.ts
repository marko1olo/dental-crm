import type { Types } from '@cornerstonejs/core';
import { StackViewport } from '@cornerstonejs/core';
import type { Annotation } from '../types';
declare function annotationHydration(viewport: Types.IViewport, toolName: string, worldPoints: Types.Point3[], options?: {
    FrameOfReferenceUID?: string;
    annotationUID?: string;
}): Annotation;
declare function getClosestImageIdForStackViewport(viewport: StackViewport, worldPos: Types.Point3, viewPlaneNormal: Types.Point3): string;
export { annotationHydration, getClosestImageIdForStackViewport };
