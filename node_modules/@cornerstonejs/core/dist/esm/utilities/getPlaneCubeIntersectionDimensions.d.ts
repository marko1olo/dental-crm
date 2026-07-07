import type { Point3 } from '../types';
import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
export declare function getCubeSizeInView(imageData: vtkImageData, viewPlaneNormal: Point3, viewUp: Point3): {
    widthWorld: number;
    heightWorld: number;
    depthWorld: number;
};
