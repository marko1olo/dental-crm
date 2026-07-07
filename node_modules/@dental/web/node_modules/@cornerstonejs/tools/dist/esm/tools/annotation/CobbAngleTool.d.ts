import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, ToolHandle, PublicToolProps, ToolProps, InteractionTypes, SVGDrawingHelper, Annotation } from '../../types';
import type { CobbAngleAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class CobbAngleTool extends AnnotationTool {
    static toolName: string;
    angleStartedNotYetCompleted: boolean;
    _throttledCalculateCachedStats: Function;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox?: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
        isNearFirstLine?: boolean;
        isNearSecondLine?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.MouseDownActivateEventType) => CobbAngleAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: CobbAngleAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.MouseDownEventType, annotation: CobbAngleAnnotation, interactionType: InteractionTypes, canvasCoords: Types.Point2, proximity?: number) => void;
    handleSelectedCallback(evt: EventTypes.MouseDownEventType, annotation: CobbAngleAnnotation, handle: ToolHandle, interactionType?: string): void;
    _endCallback: (evt: EventTypes.MouseUpEventType | EventTypes.MouseClickEventType) => void;
    _mouseDownCallback: (evt: EventTypes.MouseUpEventType | EventTypes.MouseClickEventType) => void;
    _dragCallback: (evt: EventTypes.MouseDragEventType | EventTypes.MouseMoveEventType) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: HTMLDivElement) => void;
    _deactivateModify: (element: HTMLDivElement) => void;
    _activateDraw: (element: HTMLDivElement) => void;
    _deactivateDraw: (element: HTMLDivElement) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _calculateCachedStats(annotation: any, renderingEngine: any, enabledElement: any): any;
    distanceToLines: ({ viewport, points, canvasCoords, proximity }: {
        viewport: any;
        points: any;
        canvasCoords: any;
        proximity: any;
    }) => {
        distanceToPoint: number;
        distanceToPoint2: number;
        isNearFirstLine: boolean;
        isNearSecondLine: boolean;
    };
    getArcsStartEndPoints: ({ firstLine, secondLine, mid1, mid2, }: {
        firstLine: any;
        secondLine: any;
        mid1: any;
        mid2: any;
    }) => {
        arc1Start: Types.Point2;
        arc1End: Types.Point2;
        arc2Start: Types.Point2;
        arc2End: Types.Point2;
        arc1Angle: number;
        arc2Angle: number;
    };
}
export default CobbAngleTool;
