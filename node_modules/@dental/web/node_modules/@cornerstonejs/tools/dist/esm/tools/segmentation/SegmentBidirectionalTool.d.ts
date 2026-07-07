import type { Types } from '@cornerstonejs/core';
import type { EventTypes, PublicToolProps, SVGDrawingHelper, Annotation } from '../../types';
import type { BidirectionalAnnotation, SegmentBidirectionalAnnotation } from '../../types/ToolSpecificAnnotationTypes';
import BidirectionalTool from '../annotation/BidirectionalTool';
declare class SegmentBidirectionalTool extends BidirectionalTool {
    static toolName: string;
    editData: {
        annotation: Annotation;
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    preventHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps);
    addNewAnnotation(evt: EventTypes.InteractionEventType): BidirectionalAnnotation;
    static hydrate: (viewportId: string, axis: [[Types.Point3, Types.Point3], [Types.Point3, Types.Point3]], options?: {
        segmentIndex?: number;
        segmentationId?: string;
        annotationUID?: string;
        toolInstance?: SegmentBidirectionalTool;
        referencedImageId?: string;
        viewplaneNormal?: Types.Point3;
        viewUp?: Types.Point3;
    }) => SegmentBidirectionalAnnotation;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
}
export default SegmentBidirectionalTool;
