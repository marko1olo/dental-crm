import type { ImageQualityStatus } from '../enums';
interface IStreamingVolumeProperties {
    imageIds: string[];
    loadStatus: {
        loaded: boolean;
        loading: boolean;
        cancelled: boolean;
        cachedFrames: ImageQualityStatus[];
        callbacks: (() => void)[];
    };
}
export type { IStreamingVolumeProperties as default };
