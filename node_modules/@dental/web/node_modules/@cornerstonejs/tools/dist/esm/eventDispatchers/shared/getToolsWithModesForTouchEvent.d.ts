import type { ToolModes } from '../../enums';
import type { EventTypes } from '../../types';
type ModesFilter = Array<ToolModes>;
export default function getToolsWithModesForTouchEvent(evt: EventTypes.NormalizedTouchEventType, modesFilter: ModesFilter, numTouchPoints?: number): any[];
export {};
