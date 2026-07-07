import type IGeometry from './IGeometry';
import type IImage from './IImage';
import type IImageVolume from './IImageVolume';
export interface IImageLoadObject {
    promise: Promise<IImage>;
    cancelFn?: () => void;
    decache?: () => void;
}
export interface IVolumeLoadObject {
    promise: Promise<IImageVolume>;
    cancelFn?: () => void;
    decache?: () => void;
}
export interface IGeometryLoadObject {
    promise: Promise<IGeometry>;
    cancelFn?: () => void;
    decache?: () => void;
}
