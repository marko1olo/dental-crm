import type { ToolModes } from '../../enums';
import type { ToolAction, EventTypes } from '../../types';
import type { BaseTool } from '../../tools';
export default function getToolsWithActionsForMouseEvent(evt: EventTypes.MouseMoveEventType, toolModes: ToolModes[]): Map<BaseTool, ToolAction>;
