export declare function computeStackLabelmapFromVolume({ volumeId, }: {
    volumeId: string;
}): Promise<{
    imageIds: string[];
}>;
export declare function convertVolumeToStackLabelmap({ segmentationId, options, }: {
    segmentationId: string;
    options?: {
        viewportId: string;
        newSegmentationId?: string;
        removeOriginal?: boolean;
    };
}): Promise<void>;
