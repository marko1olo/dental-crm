import type { Types } from '@cornerstonejs/core';
import type { PublicToolProps, ToolProps, EventTypes, SVGDrawingHelper, Annotation } from '../../types';
import LabelmapBaseTool from './LabelmapBaseTool';
declare class RectangleScissorsTool extends LabelmapBaseTool {
    static toolName: any;
    _throttledCalculateCachedStats: Function;
    editData: {
        volumeId: string;
        referencedVolumeId: string;
        imageId: string;
        annotation: Annotation;
        segmentationId: string;
        segmentIndex: number;
        segmentsLocked: number[];
        segmentColor: [number, number, number, number];
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    preMouseDownCallback: (evt: EventTypes.InteractionEventType) => boolean;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
}
export default RectangleScissorsTool;
