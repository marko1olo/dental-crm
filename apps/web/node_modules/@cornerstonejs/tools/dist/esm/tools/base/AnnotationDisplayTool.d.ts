import type { Types } from '@cornerstonejs/core';
import BaseTool from './BaseTool';
import type { Annotation, Annotations, EventTypes, SVGDrawingHelper } from '../../types';
import type { StyleSpecifier } from '../../types/AnnotationStyle';
declare abstract class AnnotationDisplayTool extends BaseTool {
    static toolName: any;
    abstract renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): any;
    filterInteractableAnnotationsForElement(element: HTMLDivElement, annotations: Annotations): Annotations;
    onImageSpacingCalibrated: (evt: Types.EventTypes.ImageSpacingCalibratedEvent) => void;
    static createAnnotation(...annotationBaseData: any[]): Annotation;
    protected createAnnotation(evt: EventTypes.InteractionEventType, points?: Types.Point3[], ...annotationBaseData: any[]): Annotation;
    protected getReferencedImageId(viewport: Types.IViewport, worldPos: Types.Point3, viewPlaneNormal: Types.Point3, viewUp?: Types.Point3): string;
    getStyle(property: string, specifications: StyleSpecifier, annotation?: Annotation): unknown;
}
export default AnnotationDisplayTool;
