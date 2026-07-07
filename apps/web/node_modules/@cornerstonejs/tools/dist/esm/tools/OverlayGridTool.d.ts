import type { Types } from '@cornerstonejs/core';
import type { PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../types';
import AnnotationDisplayTool from './base/AnnotationDisplayTool';
export type OverlayGridAnnotation = Annotation & {
    data: {
        viewportData: Map<string, object>;
        pointSets: Array<object>;
    };
};
declare class OverlayGridTool extends AnnotationDisplayTool {
    static toolName: any;
    _throttledCalculateCachedStats: Function;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    onSetToolEnabled: () => void;
    onSetToolActive: () => void;
    _init: () => void;
    calculateImageIdPointSets: (imageId: string) => {
        pointSet1: Types.Point3[];
        pointSet2: Types.Point3[];
    };
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    private initializeViewportData;
    private isPerpendicular;
    private isParallel;
    private getImageIdNormal;
}
export default OverlayGridTool;
