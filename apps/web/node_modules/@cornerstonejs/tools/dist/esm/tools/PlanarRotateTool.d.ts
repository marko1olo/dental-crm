import { BaseTool } from './base';
import type { PublicToolProps, ToolProps, EventTypes } from '../types';
declare class PlanarRotateTool extends BaseTool {
    static toolName: any;
    touchDragCallback: (evt: EventTypes.MouseDragEventType) => void;
    mouseDragCallback: (evt: EventTypes.MouseDragEventType) => void;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    mouseWheelCallback: (evt: EventTypes.MouseWheelEventType) => void;
    _dragCallback(evt: EventTypes.MouseDragEventType): void;
    setAngle(viewport: any, angle: any): void;
}
export default PlanarRotateTool;
