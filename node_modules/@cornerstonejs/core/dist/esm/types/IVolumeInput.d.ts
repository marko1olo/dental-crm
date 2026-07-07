import type { VolumeActor } from './IActor';
import type BlendModes from '../enums/BlendModes';
type VolumeInputCallback = (params: {
    volumeActor: VolumeActor;
    volumeId: string;
}) => unknown;
type IVolumeInput = {
    volumeId: string;
    actorUID?: string;
    visibility?: boolean;
    callback?: VolumeInputCallback;
    blendMode?: BlendModes;
    slabThickness?: number;
    [key: string]: unknown;
};
export type { IVolumeInput, VolumeInputCallback };
