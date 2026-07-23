export default function getPixelDataTypeFromMinMax(min, max) {
    let pixelDataType;
    if (Number.isInteger(min) && Number.isInteger(max)) {
        if (min >= 0) {
            if (max <= 255) {
                pixelDataType = Uint8Array;
            }
            else if (max <= 65535) {
                pixelDataType = Uint16Array;
            }
            else if (max <= 4294967295) {
                pixelDataType = Uint32Array;
            }
        }
        else {
            if (min >= -128 && max <= 127) {
                pixelDataType = Int8Array;
            }
            else if (min >= -32768 && max <= 32767) {
                pixelDataType = Int16Array;
            }
        }
    }
    return pixelDataType || Float32Array;
}
export function validatePixelDataType(min, max, type) {
    const pixelDataType = getPixelDataTypeFromMinMax(min, max);
    return pixelDataType === type;
}
