import StreamingImageVolume from '../cache/classes/StreamingImageVolume';
import type { IRetrieveConfiguration } from '../types';
interface IVolumeLoader {
    promise: Promise<StreamingImageVolume>;
    cancel: () => void;
    decache: () => void;
}
declare function cornerstoneStreamingImageVolumeLoader(volumeId: string, options: {
    imageIds: string[];
    progressiveRendering?: boolean | IRetrieveConfiguration;
}): IVolumeLoader;
export { cornerstoneStreamingImageVolumeLoader };
