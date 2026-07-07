import type { StackViewport, Types } from '@cornerstonejs/core';
import type { ContourRepresentation } from '../../../types/SegmentationStateTypes';
declare function removeRepresentation(viewportId: string, segmentationId: string, renderImmediate?: boolean): void;
declare function render(viewport: StackViewport | Types.IVolumeViewport, contourRepresentation: ContourRepresentation): Promise<void>;
declare function getUpdateFunction(viewport: Types.IVolumeViewport | Types.IStackViewport): (segmentationId: string) => Promise<void>;
declare const _default: {
    getUpdateFunction: typeof getUpdateFunction;
    render: typeof render;
    removeRepresentation: typeof removeRepresentation;
};
export default _default;
