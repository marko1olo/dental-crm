import type IImageVolume from './IImageVolume';
export default interface IStreamingImageVolume extends IImageVolume {
    load(): void;
    clearLoadCallbacks(): void;
    decache(completelyRemove?: boolean): void;
}
