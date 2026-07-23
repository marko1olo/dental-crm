import SegmentationRepresentations from '../../enums/SegmentationRepresentations';
declare function removeSegmentationRepresentation(viewportId: string, specifier: {
    segmentationId: string;
    type: SegmentationRepresentations;
}, immediate?: boolean): Array<{
    segmentationId: string;
    type: SegmentationRepresentations;
}>;
declare function removeSegmentationRepresentations(viewportId: string, specifier: {
    segmentationId?: string;
    type?: SegmentationRepresentations;
}, immediate?: boolean): Array<{
    segmentationId: string;
    type: SegmentationRepresentations;
}>;
declare function removeAllSegmentationRepresentations(): void;
declare function removeLabelmapRepresentation(viewportId: string, segmentationId: string, immediate?: boolean): void;
declare function removeContourRepresentation(viewportId: string, segmentationId: string, immediate?: boolean): void;
declare function removeSurfaceRepresentation(viewportId: string, segmentationId: string, immediate?: boolean): void;
export { removeSegmentationRepresentation, removeSegmentationRepresentations, removeAllSegmentationRepresentations, removeLabelmapRepresentation, removeContourRepresentation, removeSurfaceRepresentation, };
