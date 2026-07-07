import type { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData';
import type { Point3 } from './Point3';
import type { Scaling } from './ScalingParameters';
import type Mat3 from './Mat3';
import type { PixelDataTypedArray } from './PixelDataTypedArray';
import type RGB from './RGB';
import type IImageCalibration from './IImageCalibration';
import type { IVoxelManager } from './IVoxelManager';
interface IImageData {
    dimensions: Point3;
    direction: Mat3;
    spacing: Point3;
    numberOfComponents?: number;
    origin: Point3;
    scalarData: PixelDataTypedArray;
    imageData: vtkImageData;
    metadata: {
        Modality: string;
        FrameOfReferenceUID: string;
    };
    scaling?: Scaling;
    hasPixelSpacing?: boolean;
    voxelManager?: IVoxelManager<number> | IVoxelManager<RGB>;
    calibration?: IImageCalibration;
    preScale?: {
        scaled?: boolean;
        scalingParameters?: {
            modality?: string;
            rescaleSlope?: number;
            rescaleIntercept?: number;
            suvbw?: number;
        };
    };
}
export type { IImageData as default };
