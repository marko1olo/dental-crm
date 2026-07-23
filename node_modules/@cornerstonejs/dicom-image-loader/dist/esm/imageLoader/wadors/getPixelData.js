import { xhrRequest } from '../internal/index';
import streamRequest from '../internal/streamRequest';
import rangeRequest from '../internal/rangeRequest';
import extractMultipart from './extractMultipart';
import { getImageQualityStatus } from './getImageQualityStatus';
function getPixelData(uri, imageId, mediaType = 'application/octet-stream', options) {
    const { streamingData, retrieveOptions = {} } = options || {};
    const headers = {
        Accept: mediaType,
    };
    let url = retrieveOptions.urlArguments
        ? `${uri}${uri.indexOf('?') === -1 ? '?' : '&'}${retrieveOptions.urlArguments}`
        : uri;
    if (retrieveOptions.framesPath) {
        url = url.replace('/frames/', retrieveOptions.framesPath);
    }
    if (streamingData?.url !== url) {
        options.streamingData = { url };
    }
    if (retrieveOptions.rangeIndex !== undefined) {
        return rangeRequest(url, imageId, headers, options);
    }
    if (retrieveOptions.streaming) {
        return streamRequest(url, imageId, headers, options);
    }
    const loadPromise = xhrRequest(url, imageId, headers);
    const { xhr } = loadPromise;
    return loadPromise.then(function (imageFrameAsArrayBuffer) {
        const contentType = xhr.getResponseHeader('Content-Type') || 'application/octet-stream';
        const extracted = extractMultipart(contentType, new Uint8Array(imageFrameAsArrayBuffer));
        extracted.imageQualityStatus = getImageQualityStatus(retrieveOptions, true);
        return extracted;
    });
}
export default getPixelData;
