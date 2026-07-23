import type { Types } from '@cornerstonejs/core';
import type { EventTypes, PublicToolProps, ToolProps } from '../../types';
import GrowCutBaseTool from '../base/GrowCutBaseTool';
import type { GrowCutToolData, RemoveIslandData } from '../base/GrowCutBaseTool';
type RegionSegmentPlusToolData = GrowCutToolData & {
    worldPoint: Types.Point3;
};
declare class RegionSegmentPlusTool extends GrowCutBaseTool {
    static toolName: string;
    protected growCutData: RegionSegmentPlusToolData | null;
    private mouseTimer;
    private allowedToProceed;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    mouseMoveCallback(evt: EventTypes.MouseMoveEventType): void;
    onMouseStable(evt: EventTypes.MouseMoveEventType, worldPoint: Types.Point3, element: HTMLDivElement): Promise<void>;
    preMouseDownCallback(evt: EventTypes.MouseDownActivateEventType): Promise<boolean>;
    protected getRemoveIslandData(growCutData: RegionSegmentPlusToolData): RemoveIslandData;
    protected getGrowCutLabelmap(growCutData: any): Promise<Types.IImageVolume>;
}
export default RegionSegmentPlusTool;
