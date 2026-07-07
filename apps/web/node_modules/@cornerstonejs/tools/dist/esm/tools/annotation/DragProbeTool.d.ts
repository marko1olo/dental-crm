import type { Types } from '@cornerstonejs/core';
import type { Annotation, EventTypes, PublicToolProps, SVGDrawingHelper, ToolProps } from '../../types';
import ProbeTool from './ProbeTool';
import type { ProbeAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class DragProbeTool extends ProbeTool {
    static toolName: string;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        newAnnotation?: boolean;
    } | null;
    eventDispatchDetail: {
        viewportId: string;
        renderingEngineId: string;
    };
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    postMouseDownCallback: (evt: EventTypes.InteractionEventType) => ProbeAnnotation;
    postTouchStartCallback: (evt: EventTypes.InteractionEventType) => ProbeAnnotation;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
}
export default DragProbeTool;
