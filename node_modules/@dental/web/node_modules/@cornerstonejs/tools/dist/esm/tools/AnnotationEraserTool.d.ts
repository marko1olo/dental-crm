import { BaseTool } from './base';
import type { EventTypes, PublicToolProps, ToolProps } from '../types';
declare class AnnotationEraserTool extends BaseTool {
    static toolName: any;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    preMouseDownCallback: (evt: EventTypes.InteractionEventType) => boolean;
    preTouchStartCallback: (evt: EventTypes.InteractionEventType) => boolean;
    _deleteNearbyAnnotations(evt: EventTypes.InteractionEventType, interactionType: string): boolean;
}
export default AnnotationEraserTool;
