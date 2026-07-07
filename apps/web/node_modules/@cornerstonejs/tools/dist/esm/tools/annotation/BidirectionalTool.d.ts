import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { BidirectionalAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class BidirectionalTool extends AnnotationTool {
    static toolName: string;
    _throttledCalculateCachedStats: Function;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    preventHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation(evt: EventTypes.InteractionEventType): BidirectionalAnnotation;
    static hydrate: (viewportId: string, axis: [[Types.Point3, Types.Point3], [Types.Point3, Types.Point3]], options?: {
        annotationUID?: string;
        toolInstance?: BidirectionalTool;
        referencedImageId?: string;
        viewplaneNormal?: Types.Point3;
        viewUp?: Types.Point3;
    }) => BidirectionalAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: BidirectionalAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: BidirectionalAnnotation) => void;
    handleSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: BidirectionalAnnotation, handle: ToolHandle) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragDrawCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragModifyCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragModifyHandle: (evt: EventTypes.InteractionEventType) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _movingLongAxisWouldPutItThroughShortAxis: (firstLineSegment: any, secondLineSegment: any) => boolean;
    _calculateCachedStats: (annotation: any, renderingEngine: any, enabledElement: any) => any;
    _getSignedAngle: (vector1: any, vector2: any) => number;
}
export default BidirectionalTool;
