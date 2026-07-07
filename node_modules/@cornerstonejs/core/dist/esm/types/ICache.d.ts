import type { IImageLoadObject, IVolumeLoadObject } from './ILoadObject';
interface ICache {
    setMaxCacheSize: (maxCacheSize: number) => void;
    getMaxCacheSize: () => number;
    getCacheSize: () => number;
    putImageLoadObject: (imageId: string, imageLoadObject: IImageLoadObject, updateCache?: boolean) => Promise<void>;
    getImageLoadObject: (imageId: string) => IImageLoadObject | void;
    putVolumeLoadObject: (volumeId: string, volumeLoadObject: IVolumeLoadObject) => Promise<void>;
    getVolumeLoadObject: (volumeId: string) => IVolumeLoadObject | void;
    purgeCache: () => void;
}
export type { ICache as default };
