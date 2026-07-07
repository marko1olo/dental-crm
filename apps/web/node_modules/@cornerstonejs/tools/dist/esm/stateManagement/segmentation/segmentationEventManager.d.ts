import { type Types } from '@cornerstonejs/core';
import { SegmentationRepresentations } from '../../enums';
export declare function addDefaultSegmentationListener(viewport: Types.IVolumeViewport | Types.IStackViewport, segmentationId: string, representationType: SegmentationRepresentations): void;
declare function addSegmentationListener(segmentationId: string, representationType: string, updateFunction: (segmentationId: string) => Promise<void>): void;
declare function removeSegmentationListener(segmentationId: string, representationType: string): void;
declare function removeAllSegmentationListeners(segmentationId: string): void;
export { addSegmentationListener, removeSegmentationListener, removeAllSegmentationListeners, };
