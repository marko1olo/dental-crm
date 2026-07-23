import type { LabelmapSegmentationData } from '../../types/LabelmapTypes';
import type { ContourSegmentationData } from '../../types/ContourTypes';
import type { SurfaceSegmentationData } from '../../types/SurfaceTypes';
import SegmentationRepresentations from '../../enums/SegmentationRepresentations';
type SegmentationData = LabelmapSegmentationData | ContourSegmentationData | SurfaceSegmentationData;
type AddRepresentationData = {
    segmentationId: string;
    type: SegmentationRepresentations;
    data: SegmentationData;
};
declare function internalAddRepresentationData({ segmentationId, type, data, }: AddRepresentationData): void;
export default internalAddRepresentationData;
