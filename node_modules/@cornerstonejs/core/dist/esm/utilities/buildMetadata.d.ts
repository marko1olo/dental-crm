import { VOILUTFunctionType } from '../enums';
import type IImage from '../types/IImage';
import type { ImagePlaneModule } from '../types';
import type IImageCalibration from '../types/IImageCalibration';
export interface BuildMetadataResult {
    scalingFactor: number;
    imagePlaneModule: ImagePlaneModule;
    voiLUTFunction: VOILUTFunctionType;
    modality: string;
    calibration: IImageCalibration;
    imagePixelModule: {
        bitsAllocated: number;
        bitsStored: number;
        samplesPerPixel: number;
        highBit: number;
        photometricInterpretation: string;
        pixelRepresentation: number;
        windowWidth: number;
        windowCenter: number;
        modality: string;
        voiLUTFunction: VOILUTFunctionType;
    };
}
export declare function getValidVOILUTFunction(voiLUTFunction: VOILUTFunctionType | unknown): VOILUTFunctionType;
export declare function getImagePlaneModule(imageId: string): ImagePlaneModule;
export declare function calibrateImagePlaneModule(imageId: string, imagePlaneModule: ImagePlaneModule, currentCalibration: IImageCalibration): {
    imagePlaneModule: ImagePlaneModule;
    hasPixelSpacing: boolean;
    calibrationEvent?: {
        scale: number;
        calibration: IImageCalibration;
    };
};
export declare function buildMetadata(image: IImage): BuildMetadataResult;
