import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation, InteractionTypes, ToolHandle } from '../../types';
import type { LabelAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class LabelTool extends AnnotationTool {
    static toolName: string;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        newAnnotation?: boolean;
        hasMoved?: boolean;
        offset: Types.Point3;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    isPointNearTool: (element: HTMLDivElement, annotation: LabelAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    static hydrate: (viewportId: string, position: Types.Point3, label: string, options?: {
        annotationUID?: string;
    }) => LabelAnnotation;
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => LabelAnnotation;
    handleSelectedCallback(_evt: EventTypes.InteractionEventType, _annotation: Annotation, _handle: ToolHandle, _interactionType: InteractionTypes): void;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: LabelAnnotation) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    _doneChangingTextCallback(element: any, annotation: any, updatedLabel: any): void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: HTMLDivElement) => void;
    _deactivateModify: (element: HTMLDivElement) => void;
    _activateDraw: (element: HTMLDivElement) => void;
    _deactivateDraw: (element: HTMLDivElement) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _isInsideVolume(index1: any, index2: any, dimensions: any): boolean;
}
export default LabelTool;
