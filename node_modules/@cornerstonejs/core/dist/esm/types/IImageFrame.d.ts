import type { ImageQualityStatus } from '../enums';
import type { PixelDataTypedArray } from './PixelDataTypedArray';
interface ImageFrame {
    samplesPerPixel: number;
    photometricInterpretation: string;
    planarConfiguration: number;
    rows: number;
    columns: number;
    bitsAllocated: number;
    bitsStored: number;
    pixelRepresentation: number;
    smallestPixelValue: number;
    largestPixelValue: number;
    redPaletteColorLookupTableDescriptor: number[];
    greenPaletteColorLookupTableDescriptor: number[];
    bluePaletteColorLookupTableDescriptor: number[];
    redPaletteColorLookupTableData: number[];
    greenPaletteColorLookupTableData: number[];
    bluePaletteColorLookupTableData: number[];
    pixelData: PixelDataTypedArray;
    imageData?: ImageData;
    pixelDataLength?: number;
    preScale?: {
        enabled: boolean;
        scaled: boolean;
        scalingParameters?: {
            intercept?: number;
            slope?: number;
            rescaleSlope?: number;
            rescaleIntercept?: number;
            modality?: string;
            suvbw?: number;
        };
    };
    imageId: string;
    decodeTimeInMS?: number;
    loadTimeInMS?: number;
    imageQualityStatus?: ImageQualityStatus;
    decodeLevel?: unknown;
    transferSyntax?: string;
}
export type { ImageFrame as default };
