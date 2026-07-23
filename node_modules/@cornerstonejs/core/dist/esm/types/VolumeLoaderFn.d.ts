import type IImageVolume from './IImageVolume';
type VolumeLoaderFn = (volumeId: string, options?: Record<string, unknown>) => {
    promise: Promise<IImageVolume>;
    cancelFn?: () => void | undefined;
    decache?: () => void | undefined;
};
export type { VolumeLoaderFn as default };
