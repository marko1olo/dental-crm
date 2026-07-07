export declare function updateStackSegmentationState({ segmentationId, viewportId, imageIds, options, }: {
    segmentationId: string;
    viewportId: string;
    imageIds: string[];
    options?: {
        removeOriginal?: boolean;
    };
}): Promise<void>;
