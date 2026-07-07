import { AnnotationTool } from './base';
import type { Types } from '@cornerstonejs/core';
import type { EventTypes, ToolProps, PublicToolProps, SVGDrawingHelper, Annotation } from '../types';
declare class WindowLevelRegionTool extends AnnotationTool {
    static toolName: any;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
    } | null;
    isDrawing: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.InteractionEventType) => Annotation;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    applyWindowLevelRegion: (annotation: any, element: any) => void;
    cancel: () => void;
    isPointNearTool: () => any;
    toolSelectedCallback: () => void;
    handleSelectedCallback: () => void;
    _activateModify: () => void;
    _deactivateModify: () => void;
}
export default WindowLevelRegionTool;
