import type { SegmentationRepresentations } from '../../enums';
import type { Segmentation, SegmentationRepresentation } from '../../types';
export declare function getViewportSegmentations(viewportId: string, type?: SegmentationRepresentations): Segmentation[];
export declare function getViewportSegmentationRepresentations(viewportId: string): SegmentationRepresentation[];
