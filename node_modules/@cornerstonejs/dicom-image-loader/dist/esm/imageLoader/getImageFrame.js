import { metaData } from '@cornerstonejs/core';
function getImageFrame(imageId) {
    const imagePixelModule = metaData.get('imagePixelModule', imageId);
    return {
        samplesPerPixel: imagePixelModule.samplesPerPixel,
        photometricInterpretation: imagePixelModule.photometricInterpretation,
        planarConfiguration: imagePixelModule.planarConfiguration,
        rows: imagePixelModule.rows,
        columns: imagePixelModule.columns,
        bitsAllocated: imagePixelModule.bitsAllocated,
        bitsStored: imagePixelModule.bitsStored,
        pixelRepresentation: imagePixelModule.pixelRepresentation,
        smallestPixelValue: imagePixelModule.smallestPixelValue,
        largestPixelValue: imagePixelModule.largestPixelValue,
        redPaletteColorLookupTableDescriptor: imagePixelModule.redPaletteColorLookupTableDescriptor,
        greenPaletteColorLookupTableDescriptor: imagePixelModule.greenPaletteColorLookupTableDescriptor,
        bluePaletteColorLookupTableDescriptor: imagePixelModule.bluePaletteColorLookupTableDescriptor,
        redPaletteColorLookupTableData: imagePixelModule.redPaletteColorLookupTableData,
        greenPaletteColorLookupTableData: imagePixelModule.greenPaletteColorLookupTableData,
        bluePaletteColorLookupTableData: imagePixelModule.bluePaletteColorLookupTableData,
        pixelData: undefined,
        imageId,
    };
}
export default getImageFrame;
