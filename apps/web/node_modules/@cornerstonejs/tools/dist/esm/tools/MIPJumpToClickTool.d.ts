import { BaseTool } from './base';
import type { PublicToolProps, ToolProps } from '../types';
declare class MIPJumpToClickTool extends BaseTool {
    static toolName: any;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    mouseClickCallback(evt: any): void;
}
export default MIPJumpToClickTool;
