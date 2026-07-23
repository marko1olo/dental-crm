import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import { ChangeTypes } from '../../enums';
import type { EventTypes, ToolHandle, PublicToolProps, SVGDrawingHelper } from '../../types';
import type { ProbeAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class ProbeTool extends AnnotationTool {
    static toolName: string;
    static probeDefaults: {
        supportedInteractionTypes: string[];
        configuration: {
            shadow: boolean;
            preventHandleOutsideImage: boolean;
            getTextLines: typeof defaultGetTextLines;
            handleRadius: string;
            textCanvasOffset: {
                x: number;
                y: number;
            };
        };
    };
    constructor(toolProps?: PublicToolProps, defaultToolProps?: any);
    isPointNearTool(element: HTMLDivElement, annotation: ProbeAnnotation, canvasCoords: Types.Point2, proximity: number): boolean;
    toolSelectedCallback(): void;
    static hydrate: (viewportId: string, points: Types.Point3[], options?: {
        annotationUID?: string;
        toolInstance?: ProbeTool;
        referencedImageId?: string;
        viewplaneNormal?: Types.Point3;
        viewUp?: Types.Point3;
    }) => ProbeAnnotation;
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => ProbeAnnotation;
    getHandleNearImagePoint(element: HTMLDivElement, annotation: ProbeAnnotation, canvasCoords: Types.Point2, proximity: number): ToolHandle | undefined;
    handleSelectedCallback(evt: EventTypes.InteractionEventType, annotation: ProbeAnnotation): void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragCallback: (evt: any) => void;
    cancel: (element: HTMLDivElement) => string;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _calculateCachedStats(annotation: any, renderingEngine: any, enabledElement: any, changeType?: ChangeTypes): any;
}
declare function defaultGetTextLines(data: any, targetId: any): string[];
export default ProbeTool;
