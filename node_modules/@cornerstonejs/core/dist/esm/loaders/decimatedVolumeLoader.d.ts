import StreamingImageVolume from '../cache/classes/StreamingImageVolume';
import type { IRetrieveConfiguration } from '../types';
import type { points } from './decimatedVolumeModifiers';
interface IVolumeLoader {
    promise: Promise<StreamingImageVolume>;
    cancel: () => void;
    decache: () => void;
}
export declare function decimatedVolumeLoader(volumeId: string, options: {
    imageIds: string[];
    progressiveRendering?: boolean | IRetrieveConfiguration;
    ijkDecimation?: points.points3;
}): IVolumeLoader;
export default decimatedVolumeLoader;
