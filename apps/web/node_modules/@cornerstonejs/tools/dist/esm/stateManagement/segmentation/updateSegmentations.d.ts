import type { Segmentation } from '../../types/SegmentationStateTypes';
export declare function updateSegmentations(segmentationUpdateArray: {
    segmentationId: string;
    payload: Partial<Segmentation>;
}[], suppressEvents?: boolean): void;
