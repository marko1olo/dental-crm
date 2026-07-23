import { AnnotationTool } from '../base';
import type { Types } from '@cornerstonejs/core';
import type { EventTypes, ToolHandle, ToolProps, PublicToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { RectangleROIAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class RectangleROITool extends AnnotationTool {
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
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => RectangleROIAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: RectangleROIAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: RectangleROIAnnotation) => void;
    handleSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: RectangleROIAnnotation, handle: ToolHandle) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _getRectangleImageCoordinates: (points: Array<Types.Point2>) => {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    _calculateCachedStats: (annotation: any, viewPlaneNormal: any, viewUp: any, renderingEngine: any, enabledElement: any) => any;
    _isInsideVolume: (index1: any, index2: any, dimensions: any) => boolean;
    static hydrate: (viewportId: string, points: Types.Point3[], options?: {
        annotationUID?: string;
        toolInstance?: RectangleROITool;
        referencedImageId?: string;
        viewplaneNormal?: Types.Point3;
        viewUp?: Types.Point3;
    }) => RectangleROIAnnotation;
}
export default RectangleROITool;
