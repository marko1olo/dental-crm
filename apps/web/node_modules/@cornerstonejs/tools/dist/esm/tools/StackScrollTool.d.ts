import { BaseTool } from './base';
import type { PublicToolProps, ToolProps, EventTypes } from '../types';
declare class StackScrollTool extends BaseTool {
    static toolName: any;
    deltaY: number;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    mouseWheelCallback(evt: EventTypes.MouseWheelEventType): void;
    mouseDragCallback(evt: EventTypes.InteractionEventType): void;
    touchDragCallback(evt: EventTypes.InteractionEventType): void;
    _dragCallback(evt: EventTypes.InteractionEventType): void;
    _scrollDrag(evt: EventTypes.InteractionEventType): void;
    _scroll(evt: EventTypes.MouseWheelEventType): void;
    _getPixelPerImage(viewport: any): number;
}
export default StackScrollTool;
