import type { Types } from '@cornerstonejs/core';
import type { SVGDrawingHelper, EventTypes, ContourAnnotation } from '.';
export interface ISculptToolShape {
    renderShape(svgDrawingHelper: SVGDrawingHelper, canvasLocation: Types.Point2, options: any): void;
    configureToolSize(evt: EventTypes.InteractionEventType): void;
    interpolatePoint(viewport: Types.IViewport, angle: number, center: Types.Point2): Types.Point2;
    getEdge(viewport: Types.IViewport, p1: Types.Point3, p2: Types.Point3, mouseCanvas: Types.Point2): {
        point: Types.Point3;
        angle: number;
        canvasPoint: Types.Point2;
    };
    updateToolSize(canvasCoords: Types.Point2, viewport: Types.IViewport, activeAnnotation: ContourAnnotation): void;
    getMaxSpacing(minSpacing: number): number;
}
