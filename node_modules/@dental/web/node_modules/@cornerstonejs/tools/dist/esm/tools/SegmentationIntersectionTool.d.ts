import type { Types } from '@cornerstonejs/core';
import type { PublicToolProps, ToolProps, SVGDrawingHelper, Annotation } from '../types';
import AnnotationDisplayTool from './base/AnnotationDisplayTool';
export type WorldPointSet = {
    worldPointsSet: any;
    color: any;
};
export type SegmentationIntersectionAnnotation = Annotation & {
    data: {
        actorsWorldPointsMap: Map<string, Map<string, WorldPointSet>>;
    };
};
declare class SegmentationIntersectionTool extends AnnotationDisplayTool {
    static toolName: any;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    _init: () => void;
    onSetToolEnabled: () => void;
    onCameraModified: (evt: Types.EventTypes.CameraModifiedEvent) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
}
export default SegmentationIntersectionTool;
