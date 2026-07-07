import type { Types } from '@cornerstonejs/core';
import type { PublicToolProps, ToolProps, EventTypes, SVGDrawingHelper, Annotation } from '../../types';
import LabelmapBaseTool from './LabelmapBaseTool';
declare class SphereScissorsTool extends LabelmapBaseTool {
    static toolName: any;
    editData: {
        annotation: Annotation;
        segmentIndex: number;
        segmentsLocked: number[];
        segmentationId: string;
        volumeId: string;
        referencedVolumeId: string;
        imageId: string;
        toolGroupId: string;
        segmentColor: [number, number, number, number];
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
        centerCanvas?: Array<number>;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    preMouseDownCallback: (evt: EventTypes.InteractionEventType) => true;
    _dragCallback: (evt: EventTypes.InteractionEventType) => void;
    _endCallback: (evt: EventTypes.InteractionEventType) => void;
    _activateDraw: (element: any) => void;
    _deactivateDraw: (element: any) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
}
export default SphereScissorsTool;
