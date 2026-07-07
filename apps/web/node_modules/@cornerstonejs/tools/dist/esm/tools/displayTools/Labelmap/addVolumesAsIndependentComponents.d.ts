import { type Types } from '@cornerstonejs/core';
import type vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
export declare function addVolumesAsIndependentComponents({ viewport, volumeInputs, segmentationId, }: {
    viewport: Types.IVolumeViewport;
    volumeInputs: Types.IVolumeInput[];
    segmentationId: string;
}): Promise<{
    uid: string;
    actor: vtkVolume;
}>;
