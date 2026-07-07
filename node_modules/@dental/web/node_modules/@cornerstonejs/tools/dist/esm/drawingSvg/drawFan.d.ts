import type { Types } from '@cornerstonejs/core';
import type { SVGDrawingHelper } from '../types';
declare function drawFan(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, fanUID: string, center: Types.Point2, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number, options?: {}, dataId?: string, zIndex?: number): void;
export default drawFan;
