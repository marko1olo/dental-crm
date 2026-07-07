import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { ArrowAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class ArrowAnnotateTool extends AnnotationTool {
    static toolName: string;
    _throttledCalculateCachedStats: Function;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox?: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    static hydrate: (viewportId: string, points: Types.Point3[], label?: string, options?: {
        annotationUID?: string;
        toolInstance?: ArrowAnnotateTool;
        referencedImageId?: string;
        viewplaneNormal?: Types.Point3;
        viewUp?: Types.Point3;
    }) => ArrowAnnotation;
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => ArrowAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: ArrowAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: ArrowAnnotation) => void;
    handleSelectedCallback(evt: EventTypes.InteractionEventType, annotation: ArrowAnnotation, handle: ToolHandle): void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    touchTapCallback: (evt: EventTypes.TouchTapEventType) => void;
    doubleClickCallback: (evt: EventTypes.TouchTapEventType) => void;
    _doneChangingTextCallback(element: any, annotation: any, updatedLabel: any): void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: HTMLDivElement) => void;
    _deactivateModify: (element: HTMLDivElement) => void;
    _activateDraw: (element: HTMLDivElement) => void;
    _deactivateDraw: (element: HTMLDivElement) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _isInsideVolume(index1: any, index2: any, dimensions: any): boolean;
}
export default ArrowAnnotateTool;
