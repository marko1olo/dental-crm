import '@kitware/vtk.js/Rendering/Profiles/Volume';
import type VoxelManagerEnum from '../enums/VoxelManagerEnum';
import type { Point3, Metadata, Mat3, IImageVolume, VolumeLoaderFn, PixelDataTypedArray, PixelDataTypedArrayString, IStreamingImageVolume } from '../types';
interface VolumeLoaderOptions {
    imageIds: string[];
    progressiveRendering?: boolean;
    ijkDecimation?: [number, number, number];
}
interface DerivedVolumeOptions {
    volumeId?: string;
    targetBuffer?: {
        type: PixelDataTypedArrayString;
    };
    voxelRepresentation?: VoxelManagerEnum;
}
export interface LocalVolumeOptions {
    metadata: Metadata;
    dimensions: Point3;
    spacing: Point3;
    origin: Point3;
    direction: Mat3;
    scalarData?: PixelDataTypedArray;
    imageIds?: string[];
    referencedImageIds?: string[];
    referencedVolumeId?: string;
    preventCache?: boolean;
    targetBuffer?: {
        type: PixelDataTypedArrayString;
    };
}
export declare function loadVolume(volumeId: string, options?: VolumeLoaderOptions): Promise<IImageVolume>;
export declare function createAndCacheVolume(volumeId: string, options?: VolumeLoaderOptions): Promise<IImageVolume | IStreamingImageVolume>;
export declare function createAndCacheDerivedVolume(referencedVolumeId: string, options: DerivedVolumeOptions): IImageVolume;
export declare function createAndCacheVolumeFromImages(volumeId: string, imageIds: string[]): Promise<IImageVolume>;
export declare function createAndCacheVolumeFromImagesSync(volumeId: string, imageIds: string[]): IImageVolume;
export declare function createLocalVolume(volumeId: string, options?: LocalVolumeOptions): IImageVolume;
export declare function registerVolumeLoader(scheme: string, volumeLoader: VolumeLoaderFn): void;
export declare function getVolumeLoaderSchemes(): string[];
export declare function registerUnknownVolumeLoader(volumeLoader: VolumeLoaderFn): VolumeLoaderFn | undefined;
export declare function getUnknownVolumeLoaderSchema(): string;
export declare function createAndCacheDerivedLabelmapVolume(referencedVolumeId: string, options?: DerivedVolumeOptions): IImageVolume;
export declare function createLocalLabelmapVolume(options: LocalVolumeOptions, volumeId: string, preventCache?: boolean): IImageVolume;
export {};
