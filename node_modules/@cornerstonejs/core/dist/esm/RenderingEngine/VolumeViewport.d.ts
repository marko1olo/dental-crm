import { mat4 } from 'gl-matrix';
import type { BlendModes } from '../enums';
import { OrientationAxis } from '../enums';
import type { IVolumeInput, OrientationVectors, Point3, ViewReference, ViewReferenceSpecifier } from '../types';
import type { ViewportInput } from '../types/IViewport';
import BaseVolumeViewport from './BaseVolumeViewport';
declare class VolumeViewport extends BaseVolumeViewport {
    private _useAcquisitionPlaneForViewPlane;
    constructor(props: ViewportInput);
    setVolumes(volumeInputArray: IVolumeInput[], immediate?: boolean, suppressEvents?: boolean): Promise<void>;
    getNumberOfSlices: () => number;
    addVolumes(volumeInputArray: IVolumeInput[], immediate?: boolean, suppressEvents?: boolean): Promise<void>;
    jumpToWorld(worldPos: Point3): boolean;
    setOrientation(orientation: OrientationAxis | OrientationVectors, immediate?: boolean, suppressEvents?: boolean): void;
    protected setCameraClippingRange(): void;
    private _setViewPlaneToReformatOrientation;
    private _setViewPlaneToAcquisitionPlane;
    getBlendMode(filterActorUIDs?: string[]): BlendModes;
    setBlendMode(blendMode: BlendModes, filterActorUIDs?: any[], immediate?: boolean): void;
    resetCameraForResize: () => boolean;
    resetCamera(options?: any): boolean;
    setSlabThickness(slabThickness: number, filterActorUIDs?: any[]): void;
    resetSlabThickness(): void;
    isInAcquisitionPlane(): boolean;
    getCurrentImageIdIndex: (volumeId?: string, useSlabThickness?: boolean) => number;
    getSliceIndex: () => number;
    getSliceViewInfo(): {
        sliceIndex: number;
        slicePlane: number;
        width: number;
        height: number;
        sliceToIndexMatrix: mat4;
        indexToSliceMatrix: mat4;
    };
    getCurrentSlicePixelData(): import("../types").PixelDataTypedArray;
    getCurrentImageId: () => string | undefined;
    getViewReference(viewRefSpecifier?: ViewReferenceSpecifier): ViewReference;
    resetProperties(volumeId?: string): void;
    private _resetProperties;
    getSlicesClippingPlanes(): {
        sliceIndex: number;
        planes: {
            normal: Point3;
            origin: Point3;
        }[];
    }[];
    getSlicePlaneCoordinates: () => {
        sliceIndex: number;
        point: Point3;
    }[];
}
export default VolumeViewport;
