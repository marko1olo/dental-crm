function getConstructorFromType(bufferType, isVolumeBuffer) {
    switch (bufferType) {
        case 'Float32Array':
            return Float32Array;
        case 'Uint8Array':
            return Uint8Array;
        case 'Uint32Array':
            return Uint32Array;
        case 'Uint16Array':
        case 'Int16Array':
            if (!isVolumeBuffer) {
                return bufferType === 'Uint16Array' ? Uint16Array : Int16Array;
            }
            else {
                console.debug(`${bufferType} is not supported for volume rendering, switching back to Float32Array`);
                return Float32Array;
            }
        default:
            if (bufferType) {
                throw new Error('TargetBuffer should be Float32Array, Uint8Array, Uint16Array, Int16Array, or Uint32Array');
            }
            else {
                return Float32Array;
            }
    }
}
function getBufferConfiguration(targetBufferType, length, options = {}) {
    const { isVolumeBuffer = false } = options;
    const TypedArrayConstructor = getConstructorFromType(targetBufferType, isVolumeBuffer);
    const bytesPerElement = TypedArrayConstructor.BYTES_PER_ELEMENT;
    const numBytes = length * bytesPerElement;
    return { numBytes, TypedArrayConstructor };
}
export { getBufferConfiguration, getConstructorFromType };
