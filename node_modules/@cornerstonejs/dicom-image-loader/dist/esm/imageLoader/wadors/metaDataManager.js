import imageIdToURI from '../imageIdToURI';
import { combineFrameInstance } from './combineFrameInstance';
let metadataByImageURI = [];
let multiframeMetadataByImageURI = {};
import getValue from './metaData/getValue';
function _retrieveMultiframeMetadataImageURI(imageURI) {
    const lastSlashIdx = imageURI.indexOf('/frames/') + 8;
    const imageIdFrameless = imageURI.slice(0, lastSlashIdx);
    const frame = parseInt(imageURI.slice(lastSlashIdx), 10);
    const metadata = metadataByImageURI[`${imageIdFrameless}1`];
    return {
        metadata,
        frame,
    };
}
function retrieveMultiframeMetadataImageId(imageId) {
    const imageURI = imageIdToURI(imageId);
    return _retrieveMultiframeMetadataImageURI(imageURI);
}
function isMultiframe(metadata) {
    if (metadata['52009230'] !== undefined ||
        metadata['52009229'] !== undefined) {
        return true;
    }
    const numberOfFrames = getValue(metadata['00280008']);
    return numberOfFrames && numberOfFrames > 1;
}
function add(imageId, metadata) {
    const imageURI = imageIdToURI(imageId);
    Object.defineProperty(metadata, 'isMultiframe', {
        value: isMultiframe(metadata),
        enumerable: false,
    });
    metadataByImageURI[imageURI] = metadata;
}
function get(imageId) {
    const imageURI = imageIdToURI(imageId);
    const metadata = metadataByImageURI[imageURI];
    if (metadata && !metadata?.isMultiframe) {
        return metadata;
    }
    const cachedMetadata = multiframeMetadataByImageURI[imageURI];
    if (cachedMetadata) {
        return cachedMetadata;
    }
    const retrievedMetadata = _retrieveMultiframeMetadataImageURI(imageURI);
    if (!retrievedMetadata || !retrievedMetadata.metadata) {
        return;
    }
    const { metadata: firstFrameMetadata, frame } = retrievedMetadata;
    if (firstFrameMetadata) {
        const combined = combineFrameInstance(frame, firstFrameMetadata);
        multiframeMetadataByImageURI[imageURI] = combined;
        return combined;
    }
}
function remove(imageId) {
    const imageURI = imageIdToURI(imageId);
    metadataByImageURI[imageURI] = undefined;
    multiframeMetadataByImageURI[imageURI] = undefined;
}
function purge() {
    metadataByImageURI = [];
    multiframeMetadataByImageURI = {};
}
export { metadataByImageURI, isMultiframe, retrieveMultiframeMetadataImageId };
export default {
    add,
    get,
    remove,
    purge,
};
