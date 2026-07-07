import { BaseTool } from './base';
import type { PublicToolProps, ToolProps } from '../types';
import type { MouseWheelEventType } from '../types/EventTypes';
declare class VolumeRotateTool extends BaseTool {
    static toolName: any;
    _configuration: unknown;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    mouseWheelCallback(evt: MouseWheelEventType): void;
}
export default VolumeRotateTool;
