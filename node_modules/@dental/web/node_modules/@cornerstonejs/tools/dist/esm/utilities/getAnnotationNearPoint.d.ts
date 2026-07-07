import type { Types } from '@cornerstonejs/core';
import type { Annotation } from '../types';
declare function getAnnotationNearPoint(element: HTMLDivElement, canvasPoint: Types.Point2, proximity?: number): Annotation | null;
declare function getAnnotationNearPointOnEnabledElement(enabledElement: Types.IEnabledElement, point: Types.Point2, proximity: number): Annotation | null;
export { getAnnotationNearPoint, getAnnotationNearPointOnEnabledElement };
