import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import type { EventTypes, PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { KeyImageAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class KeyImageTool extends AnnotationTool {
    static toolName: string;
    static dataSeries: {
        data: {
            seriesLevel: boolean;
        };
    };
    static dataPoint: {
        data: {
            isPoint: boolean;
        };
    };
    _throttledCalculateCachedStats: Function;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => Annotation;
    isPointNearTool: (element: HTMLDivElement, annotation: Annotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.InteractionEventType, annotation: Annotation) => void;
    handleSelectedCallback(evt: EventTypes.InteractionEventType, annotation: KeyImageAnnotation): void;
    static setPoint(annotation: any, isPoint?: boolean, element?: any): void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    doubleClickCallback: (evt: EventTypes.TouchTapEventType) => void;
    _doneChangingTextCallback(element: any, annotation: any, updatedText: any): void;
    _dragCallback: (evt: any) => void;
    cancel(element: HTMLDivElement): string;
    _activateModify: (element: any) => void;
    _deactivateModify: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _isInsideVolume(index1: any, index2: any, dimensions: any): boolean;
}
export default KeyImageTool;
