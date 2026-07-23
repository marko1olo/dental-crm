import type { PublicToolProps } from '../../types';
import SplineROITool from './SplineROITool';
declare class SplineContourSegmentationTool extends SplineROITool {
    static toolName: string;
    private annotationCutMergeCompletedBinded;
    constructor(toolProps: PublicToolProps);
    protected isContourSegmentationTool(): boolean;
    protected initializeListeners(): void;
    protected removeListeners(): void;
    protected annotationCutMergeCompleted(evt: any): void;
}
export default SplineContourSegmentationTool;
