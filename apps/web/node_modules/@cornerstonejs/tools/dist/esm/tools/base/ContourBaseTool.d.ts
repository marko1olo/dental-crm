import type { Types } from '@cornerstonejs/core';
import type { Annotation, ContourAnnotation, EventTypes, PublicToolProps, ToolProps, SVGDrawingHelper, AnnotationRenderContext } from '../../types';
import AnnotationTool from './AnnotationTool';
import type { ContourWindingDirection } from '../../types/ContourAnnotation';
declare abstract class ContourBaseTool extends AnnotationTool {
    constructor(toolProps: PublicToolProps, defaultToolProps: ToolProps);
    static getContourSequence(toolData: any, metadataProvider: any): {
        NumberOfContourPoints: number;
        ContourImageSequence: any;
        ContourGeometricType: string;
        ContourData: any[];
    };
    renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): boolean;
    protected createAnnotation(evt: EventTypes.InteractionEventType): ContourAnnotation;
    protected addAnnotation(annotation: Annotation, element: HTMLDivElement): string;
    protected cancelAnnotation(annotation: Annotation): void;
    protected moveAnnotation(annotation: Annotation, worldPosDelta: Types.Point3): void;
    protected updateContourPolyline(annotation: ContourAnnotation, polylineData: {
        points: Types.Point2[];
        closed?: boolean;
        targetWindingDirection?: ContourWindingDirection;
    }, transforms: {
        canvasToWorld: (point: Types.Point2) => Types.Point3;
        worldToCanvas: (point: Types.Point3) => Types.Point2;
    }, options?: {
        updateWindingDirection?: boolean;
    }): void;
    protected getPolylinePoints(annotation: ContourAnnotation): Types.Point3[];
    protected renderAnnotationInstance(renderContext: AnnotationRenderContext): boolean;
}
export { ContourBaseTool as default, ContourBaseTool };
