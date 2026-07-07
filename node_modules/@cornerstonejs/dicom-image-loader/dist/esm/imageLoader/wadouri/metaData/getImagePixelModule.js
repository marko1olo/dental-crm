function getLutDescriptor(dataSet, tag) {
    if (!dataSet.elements[tag] || dataSet.elements[tag].length !== 6) {
        return;
    }
    return [
        dataSet.uint16(tag, 0),
        dataSet.uint16(tag, 1),
        dataSet.uint16(tag, 2),
    ];
}
function getLutData(lutDataSet, tag, lutDescriptor) {
    const lut = [];
    const lutData = lutDataSet.elements[tag];
    for (let i = 0; i < lutDescriptor[0]; i++) {
        if (lutDescriptor[2] === 16) {
            lut[i] = lutDataSet.uint16(tag, i);
        }
        else {
            lut[i] = lutDataSet.byteArray[i + lutData.dataOffset];
        }
    }
    return lut;
}
function populatePaletteColorLut(dataSet, imagePixelModule) {
    imagePixelModule.redPaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281101');
    imagePixelModule.greenPaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281102');
    imagePixelModule.bluePaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281103');
    if (imagePixelModule.redPaletteColorLookupTableDescriptor[0] === 0) {
        imagePixelModule.redPaletteColorLookupTableDescriptor[0] = 65536;
        imagePixelModule.greenPaletteColorLookupTableDescriptor[0] = 65536;
        imagePixelModule.bluePaletteColorLookupTableDescriptor[0] = 65536;
    }
    const numLutEntries = imagePixelModule.redPaletteColorLookupTableDescriptor[0];
    const lutData = dataSet.elements.x00281201;
    const lutBitsAllocated = lutData.length === numLutEntries ? 8 : 16;
    if (imagePixelModule.redPaletteColorLookupTableDescriptor[2] !==
        lutBitsAllocated) {
        imagePixelModule.redPaletteColorLookupTableDescriptor[2] = lutBitsAllocated;
        imagePixelModule.greenPaletteColorLookupTableDescriptor[2] =
            lutBitsAllocated;
        imagePixelModule.bluePaletteColorLookupTableDescriptor[2] =
            lutBitsAllocated;
    }
    imagePixelModule.redPaletteColorLookupTableData = getLutData(dataSet, 'x00281201', imagePixelModule.redPaletteColorLookupTableDescriptor);
    imagePixelModule.greenPaletteColorLookupTableData = getLutData(dataSet, 'x00281202', imagePixelModule.greenPaletteColorLookupTableDescriptor);
    imagePixelModule.bluePaletteColorLookupTableData = getLutData(dataSet, 'x00281203', imagePixelModule.bluePaletteColorLookupTableDescriptor);
}
function populateSmallestLargestPixelValues(dataSet, imagePixelModule) {
    const pixelRepresentation = dataSet.uint16('x00280103');
    if (pixelRepresentation === 0) {
        imagePixelModule.smallestPixelValue = dataSet.uint16('x00280106');
        imagePixelModule.largestPixelValue = dataSet.uint16('x00280107');
    }
    else {
        imagePixelModule.smallestPixelValue = dataSet.int16('x00280106');
        imagePixelModule.largestPixelValue = dataSet.int16('x00280107');
    }
}
function getImagePixelModule(dataSet) {
    const imagePixelModule = {
        samplesPerPixel: dataSet.uint16('x00280002'),
        photometricInterpretation: dataSet.string('x00280004'),
        rows: dataSet.uint16('x00280010'),
        columns: dataSet.uint16('x00280011'),
        bitsAllocated: dataSet.uint16('x00280100'),
        bitsStored: dataSet.uint16('x00280101'),
        highBit: dataSet.uint16('x00280102'),
        pixelRepresentation: dataSet.uint16('x00280103'),
        planarConfiguration: dataSet.uint16('x00280006'),
        pixelAspectRatio: dataSet.string('x00280034'),
    };
    populateSmallestLargestPixelValues(dataSet, imagePixelModule);
    if (imagePixelModule.photometricInterpretation === 'PALETTE COLOR' &&
        dataSet.elements.x00281101) {
        populatePaletteColorLut(dataSet, imagePixelModule);
    }
    return imagePixelModule;
}
export default getImagePixelModule;
