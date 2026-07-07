import type { SegmentationRepresentations } from '../../enums';
export declare function setSegmentationRepresentationVisibility(viewportId: string, specifier: {
    segmentationId: string;
    type: SegmentationRepresentations;
}, visible: boolean): void;
