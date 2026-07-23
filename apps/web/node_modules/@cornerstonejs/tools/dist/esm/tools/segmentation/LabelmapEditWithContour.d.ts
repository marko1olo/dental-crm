import PlanarFreehandContourSegmentationTool from '../annotation/PlanarFreehandContourSegmentationTool';
import type { PublicToolProps } from '../../types';
declare class LabelMapEditWithContourTool extends PlanarFreehandContourSegmentationTool {
    static toolName: string;
    static annotationsToViewportMap: Map<any, any>;
    private onViewportAddedToToolGroupBinded;
    private onSegmentationModifiedBinded;
    static viewportIdsChecked: any[];
    constructor(toolProps?: PublicToolProps);
    protected initializeListeners(): void;
    protected cleanUpListeners(): void;
    protected checkContourSegmentation(viewportId: string): Promise<boolean>;
    protected onViewportAddedToToolGroup(evt: any): void;
    protected onSegmentationModified(evt: any): void;
    onSetToolEnabled(): void;
    onSetToolActive(): void;
    onSetToolDisabled(): void;
    annotationModified(evt: any): void;
    annotationCompleted(evt: any): void;
}
export default LabelMapEditWithContourTool;
