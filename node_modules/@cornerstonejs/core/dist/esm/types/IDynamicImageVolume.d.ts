import type IImageVolume from './IImageVolume';
interface IDynamicImageVolume extends IImageVolume {
    get dimensionGroupNumber(): number;
    set dimensionGroupNumber(dimensionGroupNumber: number);
    get numDimensionGroups(): number;
    scroll(delta: number): void;
}
export type { IDynamicImageVolume as default };
