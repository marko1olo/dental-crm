import type { Types } from '@cornerstonejs/core';
import { BaseTool } from '../base';
import type { PublicToolProps, ToolProps, EventTypes, SVGDrawingHelper } from '../../types';
import type { Segmentation } from '../../types/SegmentationStateTypes';
declare class SegmentLabelTool extends BaseTool {
    static toolName: any;
    private hoverTimer;
    private data;
    private _editData;
    constructor(toolProps?: PublicToolProps & Record<string, unknown>, defaultToolProps?: ToolProps);
    mouseMoveCallback: (evt: EventTypes.InteractionEventType) => boolean;
    onSetToolEnabled: () => void;
    onSetToolActive: () => void;
    onSetToolDisabled: () => void;
    _setHoveredSegment(evt?: EventTypes.InteractionEventType): void;
    _setHoveredSegmentForType(activeSegmentation: Segmentation, worldPoint: Types.Point3, viewport: Types.IStackViewport | Types.IVolumeViewport): void;
    renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): void;
}
export default SegmentLabelTool;
