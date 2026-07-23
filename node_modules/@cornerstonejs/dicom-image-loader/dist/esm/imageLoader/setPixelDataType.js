import getPixelDataTypeFromMinMax from '../shared/getPixelDataTypeFromMinMax';
function setPixelDataType(imageFrame) {
    const minValue = imageFrame.smallestPixelValue;
    const maxValue = imageFrame.largestPixelValue;
    const TypedArray = getPixelDataTypeFromMinMax(minValue, maxValue);
    if (TypedArray) {
        const typedArray = new TypedArray(imageFrame.pixelData);
        imageFrame.pixelData = typedArray;
    }
    else {
        throw new Error('Could not apply a typed array to the pixel data');
    }
}
export default setPixelDataType;
