import type { Types } from '@cornerstonejs/core';
import type { EventTypes, PublicToolProps, ToolProps, SVGDrawingHelper } from '../../types';
import type { GrowCutToolData } from '../base/GrowCutBaseTool';
import GrowCutBaseTool from '../base/GrowCutBaseTool';
type RegionSegmentToolData = GrowCutToolData & {
    circleCenterPoint: Types.Point3;
    circleBorderPoint: Types.Point3;
};
declare class RegionSegmentTool extends GrowCutBaseTool {
    static toolName: string;
    protected growCutData: RegionSegmentToolData | null;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    preMouseDownCallback(evt: EventTypes.MouseDownActivateEventType): Promise<boolean>;
    private _dragCallback;
    private _endCallback;
    protected getGrowCutLabelmap(growCutData: any): Promise<Types.IImageVolume>;
    private _activateDraw;
    private _deactivateDraw;
    renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): void;
}
export default RegionSegmentTool;
