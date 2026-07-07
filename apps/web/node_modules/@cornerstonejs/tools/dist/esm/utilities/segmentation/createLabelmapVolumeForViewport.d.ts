import type { Types } from '@cornerstonejs/core';
export default function createLabelmapVolumeForViewport(input: {
    viewportId: string;
    renderingEngineId: string;
    segmentationId?: string;
    options?: Types.LocalVolumeOptions & {
        volumeId?: string;
    };
}): Promise<string>;
