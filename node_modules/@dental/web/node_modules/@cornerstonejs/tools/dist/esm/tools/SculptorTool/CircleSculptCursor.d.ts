import type { Types } from '@cornerstonejs/core';
import type { ISculptToolShape } from '../../types/ISculptToolShape';
import type { SVGDrawingHelper, EventTypes, ContourAnnotationData } from '../../types';
export type PushedHandles = {
    first?: number;
    last?: number;
};
declare class CircleSculptCursor implements ISculptToolShape {
    static shapeName: string;
    private toolInfo;
    renderShape(svgDrawingHelper: SVGDrawingHelper, canvasLocation: Types.Point2, options: unknown): void;
    configureToolSize(evt: EventTypes.InteractionEventType): void;
    updateToolSize(canvasCoords: Types.Point2, viewport: Types.IViewport, activeAnnotation: ContourAnnotationData): void;
    getMaxSpacing(minSpacing: number): number;
    computeWorldRadius(viewport: any, clearExisting?: boolean): any;
    getEdge(viewport: any, p1: Types.Point3, p2: Types.Point3, mouseCanvas: Types.Point2): {
        point: any;
        angle: number;
        canvasPoint: any;
    };
    interpolatePoint(viewport: any, angle: any, center: any): any;
    isInCursor(point: any, mousePoint: any): boolean;
}
export default CircleSculptCursor;
