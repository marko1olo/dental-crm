import * as dicomParser from 'dicom-parser';
function framesAreFragmented(dataSet) {
    const numberOfFrames = dataSet.intString('x00280008');
    const pixelDataElement = dataSet.elements.x7fe00010;
    return numberOfFrames !== pixelDataElement.fragments.length;
}
export default function getEncapsulatedImageFrame(dataSet, frameIndex) {
    if (dataSet.elements.x7fe00010 &&
        dataSet.elements.x7fe00010.basicOffsetTable.length) {
        return dicomParser.readEncapsulatedImageFrame(dataSet, dataSet.elements.x7fe00010, frameIndex);
    }
    if (framesAreFragmented(dataSet)) {
        const basicOffsetTable = dicomParser.createJPEGBasicOffsetTable(dataSet, dataSet.elements.x7fe00010);
        return dicomParser.readEncapsulatedImageFrame(dataSet, dataSet.elements.x7fe00010, frameIndex, basicOffsetTable);
    }
    const fragments = dataSet.elements.x7fe00010.fragments;
    const byteStream = new dicomParser.ByteStream(dataSet.byteArrayParser, dataSet.byteArray, dataSet.elements.x7fe00010.dataOffset);
    const basicOffsetTable = dicomParser.readSequenceItem(byteStream);
    if (basicOffsetTable.tag !== 'xfffee000') {
        throw 'dicomParser.readEncapsulatedPixelData: missing basic offset table xfffee000';
    }
    byteStream.seek(basicOffsetTable.length);
    const fragmentZeroPosition = byteStream.position;
    if (frameIndex + 1 > fragments.length) {
        throw 'dicomParser.readEncapsulatedPixelData: frame exceeds number of fragments';
    }
    const fragmentHeaderSize = 8;
    const byteOffset = fragmentZeroPosition + fragments[frameIndex].offset + fragmentHeaderSize;
    const length = fragments[frameIndex].length;
    return new Uint8Array(byteStream.byteArray.buffer.slice(byteStream.byteArray.byteOffset + byteOffset, byteStream.byteArray.byteOffset + byteOffset + length));
}
