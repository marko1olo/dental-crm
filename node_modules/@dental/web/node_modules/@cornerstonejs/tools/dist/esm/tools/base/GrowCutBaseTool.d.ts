import { type Types } from '@cornerstonejs/core';
import { BaseTool } from '../base';
import type { EventTypes, PublicToolProps, ToolProps } from '../../types';
import type { GrowCutOneClickOptions } from '../../utilities/segmentation/growCut/runOneClickGrowCut';
type GrowCutToolData = {
    metadata: Types.ViewReference & {
        viewUp?: Types.Point3;
    };
    segmentation: {
        segmentationId: string;
        segmentIndex: number;
        labelmapVolumeId: string;
        referencedVolumeId: string;
    };
    islandRemoval?: {
        worldIslandPoints: Types.Point3[];
    };
    viewportId: string;
    renderingEngineId: string;
    options?: Partial<GrowCutOneClickOptions>;
};
type RemoveIslandData = {
    worldIslandPoints?: Types.Point3[];
    ijkIslandPoints?: Types.Point3[];
    islandPointIndexes?: number[];
};
declare class GrowCutBaseTool extends BaseTool {
    static toolName: any;
    protected growCutData: GrowCutToolData | null;
    private static lastGrowCutCommand;
    protected seeds: {
        positiveSeedIndices: Set<number>;
        negativeSeedIndices: Set<number>;
    } | null;
    constructor(toolProps: PublicToolProps, defaultToolProps: ToolProps);
    preMouseDownCallback(evt: EventTypes.MouseDownActivateEventType): Promise<boolean>;
    shrink(): void;
    expand(): void;
    refresh(): void;
    protected getGrowCutLabelmap(_growCutData: GrowCutToolData): Promise<Types.IImageVolume>;
    protected runGrowCut(): Promise<void>;
    protected applyPartialGrowCutLabelmap(segmentationId: string, segmentIndex: number, targetLabelmap: Types.IImageVolume, sourceLabelmap: Types.IImageVolume): void;
    protected applyGrowCutLabelmap(segmentationId: string, segmentIndex: number, targetLabelmap: Types.IImageVolume, sourceLabelmap: Types.IImageVolume): void;
    private _runLastCommand;
    protected getLabelmapSegmentationData(viewport: Types.IViewport): Promise<{
        segmentationId: string;
        segmentIndex: number;
        labelmapVolumeId: string;
        referencedVolumeId: string;
    }>;
    private _createFakeVolume;
    protected _isOrthogonalView(viewport: Types.IViewport, referencedVolumeId: string): boolean;
    protected getRemoveIslandData(_growCutData: GrowCutToolData): RemoveIslandData;
    private _removeIslands;
    protected getSegmentStyle({ segmentationId, viewportId, segmentIndex }: {
        segmentationId: any;
        viewportId: any;
        segmentIndex: any;
    }): {
        color: string;
        fillColor: string;
        lineWidth: number;
        fillOpacity: number;
        lineDash: any;
        textbox: {
            color: string;
        };
        visibility: boolean;
    };
}
export default GrowCutBaseTool;
export type { GrowCutToolData, RemoveIslandData };
