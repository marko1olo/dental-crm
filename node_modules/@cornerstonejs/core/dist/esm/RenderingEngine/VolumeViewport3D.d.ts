import type { BlendModes } from '../enums';
import type { ViewportInput } from '../types/IViewport';
import BaseVolumeViewport from './BaseVolumeViewport';
declare class VolumeViewport3D extends BaseVolumeViewport {
    constructor(props: ViewportInput);
    setSampleDistanceMultiplier: (multiplier: number) => void;
    getNumberOfSlices: () => number;
    isInAcquisitionPlane(): boolean;
    resetCamera({ resetPan, resetZoom, resetToCenter, }?: {
        resetPan?: boolean;
        resetZoom?: boolean;
        resetToCenter?: boolean;
    }): boolean;
    getRotation: () => number;
    getCurrentImageIdIndex: () => number;
    getCurrentImageId: () => string;
    setSlabThickness(slabThickness: number, filterActorUIDs?: string[]): void;
    setBlendMode(blendMode: BlendModes, filterActorUIDs?: string[], immediate?: boolean): void;
    resetProperties(volumeId?: string): void;
    resetCameraForResize: () => boolean;
    getSliceIndex(): number;
    setCamera(props: any): void;
    protected setCameraClippingRange(): void;
    resetSlabThickness(): void;
}
export default VolumeViewport3D;
