import type { SegmentationRepresentations } from '../../../enums';
declare function setSegmentationRepresentationVisibility(viewportId: string, specifier: {
    segmentationId: string;
    type?: SegmentationRepresentations;
}, visibility: boolean): void;
declare function getSegmentationRepresentationVisibility(viewportId: string, specifier: {
    segmentationId: string;
    type: SegmentationRepresentations;
}): boolean | undefined;
declare function setSegmentIndexVisibility(viewportId: string, specifier: {
    segmentationId: string;
    type?: SegmentationRepresentations;
}, segmentIndex: number, visibility: boolean): void;
declare function getSegmentIndexVisibility(viewportId: string, specifier: {
    segmentationId: string;
    type: SegmentationRepresentations;
}, segmentIndex: number): boolean;
declare function getHiddenSegmentIndices(viewportId: string, specifier: {
    segmentationId: string;
    type: SegmentationRepresentations;
}): Set<number>;
export { setSegmentationRepresentationVisibility, getSegmentationRepresentationVisibility, setSegmentIndexVisibility, getSegmentIndexVisibility, getHiddenSegmentIndices, };
