import { AnnotationTool } from '../base';
import type { Types } from '@cornerstonejs/core';
import type { EventTypes, PublicToolProps, ToolProps, SVGDrawingHelper } from '../../types';
import type { Annotation } from '../../types/AnnotationTypes';
export interface ETDRSGridAnnotation extends Annotation {
    data: {
        handles: {
            points: [Types.Point3];
        };
    };
}
declare class ETDRSGridTool extends AnnotationTool {
    static toolName: string;
    touchDragCallback: unknown;
    mouseDragCallback: unknown;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: Array<string>;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => ETDRSGridAnnotation;
    worldMeasureToCanvas(measurement: any, viewport: any): number;
    isPointNearTool: (element: HTMLDivElement, annotation: ETDRSGridAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: ETDRSGridAnnotation) => void;
    handleSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: ETDRSGridAnnotation) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragDrawCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragModifyCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragHandle: (evt: EventTypes.InteractionEventType) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
}
export default ETDRSGridTool;
