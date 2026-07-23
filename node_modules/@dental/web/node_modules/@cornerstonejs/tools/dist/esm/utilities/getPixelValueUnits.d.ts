type pixelUnitsOptions = {
    isPreScaled: boolean;
    isSuvScaled: boolean;
};
declare function getPixelValueUnitsImageId(imageId: string, options: pixelUnitsOptions): string;
declare function getPixelValueUnits(modality: string, imageId: string, options: pixelUnitsOptions): string;
export type { pixelUnitsOptions };
export { getPixelValueUnits, getPixelValueUnitsImageId };
