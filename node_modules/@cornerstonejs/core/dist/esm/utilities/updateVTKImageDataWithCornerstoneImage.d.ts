import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import type { IImage } from '../types';
declare function updateVTKImageDataWithCornerstoneImage(sourceImageData: vtkImageData, image: IImage): void;
export { updateVTKImageDataWithCornerstoneImage };
