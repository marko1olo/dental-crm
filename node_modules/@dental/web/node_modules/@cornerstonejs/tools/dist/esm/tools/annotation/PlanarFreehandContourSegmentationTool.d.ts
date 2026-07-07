import type { AnnotationRenderContext, PublicToolProps } from '../../types';
import PlanarFreehandROITool from './PlanarFreehandROITool';
export declare class PlanarFreehandContourSegmentationTool extends PlanarFreehandROITool {
    static toolName: string;
    constructor(toolProps: PublicToolProps);
    protected isContourSegmentationTool(): boolean;
    protected renderAnnotationInstance(renderContext: AnnotationRenderContext): boolean;
}
export default PlanarFreehandContourSegmentationTool;
