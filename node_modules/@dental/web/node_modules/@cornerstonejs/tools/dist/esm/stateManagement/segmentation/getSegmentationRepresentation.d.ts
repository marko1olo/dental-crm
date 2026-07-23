import type { SegmentationRepresentations } from '../../enums';
import type { SegmentationRepresentation } from '../../types/SegmentationStateTypes';
export declare function getSegmentationRepresentations(viewportId: string, specifier?: {
    segmentationId?: string;
    type?: SegmentationRepresentations;
}): SegmentationRepresentation[] | [];
export declare function getSegmentationRepresentation(viewportId: string, specifier: {
    segmentationId: string;
    type: SegmentationRepresentations;
}): SegmentationRepresentation | undefined;
export declare function getSegmentationRepresentationsBySegmentationId(segmentationId: string): {
    viewportId: string;
    representations: SegmentationRepresentation[];
}[];
