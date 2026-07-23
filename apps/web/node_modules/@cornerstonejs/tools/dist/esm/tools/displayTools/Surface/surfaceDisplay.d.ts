import type { Types } from '@cornerstonejs/core';
import type { SegmentationRepresentation } from '../../../types/SegmentationStateTypes';
declare function removeRepresentation(viewportId: string, segmentationId: string, renderImmediate?: boolean): void;
declare function render(viewport: Types.IVolumeViewport | Types.IStackViewport, representation: SegmentationRepresentation): Promise<void>;
declare function getUpdateFunction(viewport: Types.IVolumeViewport | Types.IStackViewport): (segmentationId: string) => Promise<void>;
declare const _default: {
    getUpdateFunction: typeof getUpdateFunction;
    render: typeof render;
    removeRepresentation: typeof removeRepresentation;
};
export default _default;
export { getUpdateFunction, render, removeRepresentation };
