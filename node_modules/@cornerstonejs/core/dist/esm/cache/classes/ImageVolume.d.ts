import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import type { Metadata, Point3, Mat3, ImageVolumeProps, IImage, PixelDataTypedArrayString, RGB, IVoxelManager } from '../../types';
import type vtkOpenGLTexture from '@kitware/vtk.js/Rendering/OpenGL/Texture';
export interface vtkStreamingOpenGLTexture extends vtkOpenGLTexture {
    setUpdatedFrame: (frame: number) => void;
    setVolumeId: (volumeId: string) => void;
    releaseGraphicsResources: () => void;
    hasUpdatedFrames: () => boolean;
}
export declare class ImageVolume {
    private _imageIds;
    private _imageIdsIndexMap;
    private _imageURIsIndexMap;
    protected totalNumFrames: number;
    protected cornerstoneImageMetaData: any;
    readonly volumeId: string;
    isPreScaled: boolean;
    dimensions: Point3;
    direction: Mat3;
    metadata: Metadata;
    origin: Point3;
    scaling?: {
        PT?: {
            SUVlbmFactor?: number;
            SUVbsaFactor?: number;
            suvbwToSuvlbm?: number;
            suvbwToSuvbsa?: number;
        };
    };
    spacing: Point3;
    numVoxels: number;
    imageData?: vtkImageData;
    vtkOpenGLTexture: vtkStreamingOpenGLTexture;
    loadStatus?: Record<string, unknown>;
    referencedVolumeId?: string;
    referencedImageIds?: string[];
    hasPixelSpacing: boolean;
    additionalDetails?: Record<string, unknown>;
    numDimensionGroups: number;
    voxelManager?: IVoxelManager<number> | IVoxelManager<RGB>;
    dataType?: PixelDataTypedArrayString;
    get numTimePoints(): number;
    numFrames: number;
    suppressWarnings: boolean;
    constructor(props: ImageVolumeProps);
    get sizeInBytes(): number;
    get imageIds(): string[];
    set imageIds(newImageIds: string[]);
    private _reprocessImageIds;
    cancelLoading: () => void;
    isDynamicVolume(): boolean;
    getImageIdIndex(imageId: string): number;
    getImageIdByIndex(imageIdIndex: number): string;
    getImageURIIndex(imageURI: string): number;
    load(callback?: (...args: unknown[]) => void): void;
    destroy(): void;
    invalidate(): void;
    modified(): void;
    removeFromCache(): void;
    getScalarDataLength(): number;
    private _getNumFrames;
    protected imageIdIndexToFrameIndex(imageIdIndex: number): number;
    getCornerstoneImages(): IImage[];
}
export default ImageVolume;
