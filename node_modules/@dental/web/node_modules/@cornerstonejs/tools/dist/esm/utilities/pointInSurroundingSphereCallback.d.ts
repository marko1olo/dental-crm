import type { Types } from '@cornerstonejs/core';
import type { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData';
export declare function pointInSurroundingSphereCallback(imageData: vtkImageData, circlePoints: [Types.Point3, Types.Point3], callback: (args: {
    value: unknown;
    index: number;
    pointIJK: Types.Point3;
    pointLPS: Types.Point3;
}) => void, viewport?: Types.IVolumeViewport): void;
