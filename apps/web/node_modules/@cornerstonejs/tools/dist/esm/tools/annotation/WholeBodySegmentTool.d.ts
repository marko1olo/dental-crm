import type { Types } from '@cornerstonejs/core';
import type { EventTypes, PublicToolProps, ToolProps, SVGDrawingHelper } from '../../types';
import type { GrowCutToolData, RemoveIslandData } from '../base/GrowCutBaseTool';
import GrowCutBaseTool from '../base/GrowCutBaseTool';
type HorizontalLine = [Types.Point3, Types.Point3];
type WholeBodySegmentToolData = GrowCutToolData & {
    horizontalLines: [HorizontalLine, HorizontalLine];
};
declare class WholeBodySegmentTool extends GrowCutBaseTool {
    static toolName: any;
    protected growCutData: WholeBodySegmentToolData | null;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    preMouseDownCallback(evt: EventTypes.MouseDownActivateEventType): Promise<boolean>;
    private _dragCallback;
    private _endCallback;
    renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): void;
    protected getGrowCutLabelmap(growCutData: any): Promise<Types.IImageVolume>;
    protected getRemoveIslandData(): RemoveIslandData;
    private _activateDraw;
    private _deactivateDraw;
    private _projectWorldPointAcrossSlices;
    private _getCuboidIJKEdgePointsFromProjectedWorldPoint;
    private _getWorldCuboidCornerPoints;
    private _getWorldBoundingBoxFromProjectedSquare;
    private _getViewportVolume;
    private _getHorizontalLineIJKPoints;
    private _getHorizontalLineWorldPoints;
}
export default WholeBodySegmentTool;
