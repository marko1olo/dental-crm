import type { Annotation, EventTypes, PublicToolProps, ToolProps, AnnotationRenderContext, Annotations } from '../../types';
import type { ContourAnnotation } from '../../types/ToolSpecificAnnotationTypes';
import type { StyleSpecifier } from '../../types/AnnotationStyle';
import ContourBaseTool from './ContourBaseTool';
declare abstract class ContourSegmentationBaseTool extends ContourBaseTool {
    static PreviewSegmentIndex: number;
    constructor(toolProps: PublicToolProps, defaultToolProps: ToolProps);
    protected onSetToolConfiguration(): void;
    protected isContourSegmentationTool(): boolean;
    protected createAnnotation(evt: EventTypes.InteractionEventType): ContourAnnotation;
    protected addAnnotation(annotation: Annotation, element: HTMLDivElement): string;
    protected cancelAnnotation(annotation: Annotation): void;
    protected getAnnotationStyle(context: {
        annotation: Annotation;
        styleSpecifier: StyleSpecifier;
    }): any;
    protected renderAnnotationInstance(renderContext: AnnotationRenderContext): boolean;
    filterInteractableAnnotationsForElement(element: HTMLDivElement, annotations: Annotations): Annotations;
    private _getContourSegmentationStyle;
}
export { ContourSegmentationBaseTool as default, ContourSegmentationBaseTool };
