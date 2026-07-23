import { CalibrationTypes } from '../enums';
export declare function getERMF(instance: any): any;
export declare function calculateRadiographicPixelSpacing(instance: any): {
    PixelSpacing: any;
    type: CalibrationTypes;
    isProjection: boolean;
};
export declare function getPixelSpacingInformation(instance: any): {
    PixelSpacing: any;
    type: CalibrationTypes;
    isProjection: boolean;
};
export default getPixelSpacingInformation;
