import type { Point3 } from '../types';
import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
export declare function rotateToViewCoordinates(imageData: vtkImageData, viewPlaneNormal: Point3, viewUp: Point3): Point3[];
