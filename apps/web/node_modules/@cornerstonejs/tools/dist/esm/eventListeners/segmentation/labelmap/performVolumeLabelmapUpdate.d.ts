import type { SegmentationRepresentations } from '../../../enums';
export declare function performVolumeLabelmapUpdate({ modifiedSlicesToUse, representationData, type, }: {
    modifiedSlicesToUse: number[];
    representationData: Record<string, unknown>;
    type: SegmentationRepresentations;
}): void;
