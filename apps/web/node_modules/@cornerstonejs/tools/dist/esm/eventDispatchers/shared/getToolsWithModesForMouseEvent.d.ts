import type { ToolModes } from '../../enums';
import type { EventTypes } from '../../types';
type ModesFilter = Array<ToolModes>;
export default function getToolsWithModesForMouseEvent(evt: EventTypes.MouseMoveEventType, modesFilter: ModesFilter, evtButton?: number): any[];
export {};
