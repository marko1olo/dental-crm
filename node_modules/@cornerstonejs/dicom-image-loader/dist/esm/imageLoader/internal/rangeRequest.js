import { getOptions } from './options';
import metaDataManager from '../wadors/metaDataManager';
import extractMultipart from '../wadors/extractMultipart';
import { getImageQualityStatus } from '../wadors/getImageQualityStatus';
export default function rangeRequest(url, imageId, defaultHeaders = {}, options = {}) {
    const globalOptions = getOptions();
    const { retrieveOptions = {}, streamingData } = options;
    const chunkSize = streamingData.chunkSize ||
        getValue(imageId, retrieveOptions, 'chunkSize') ||
        65536;
    const errorInterceptor = (err) => {
        if (typeof globalOptions.errorInterceptor === 'function') {
            const error = new Error('request failed');
            globalOptions.errorInterceptor(error);
        }
        else {
            console.warn('rangeRequest:Caught', err);
        }
    };
    const promise = new Promise(async (resolve, reject) => {
        const headers = Object.assign({}, defaultHeaders);
        Object.keys(headers).forEach(function (key) {
            if (headers[key] === null || headers[key] === undefined) {
                delete headers[key];
            }
        });
        try {
            if (!streamingData.encodedData) {
                streamingData.chunkSize = chunkSize;
                streamingData.rangesFetched = 0;
            }
            const byteRange = getByteRange(streamingData, retrieveOptions);
            const { encodedData, responseHeaders } = await fetchRangeAndAppend(url, headers, byteRange, streamingData);
            const contentType = responseHeaders.get('content-type');
            const { totalBytes } = streamingData;
            const doneAllBytes = totalBytes === encodedData.byteLength;
            const extract = extractMultipart(contentType, encodedData, {
                isPartial: true,
            });
            const imageQualityStatus = getImageQualityStatus(retrieveOptions, doneAllBytes || extract.extractDone === true);
            resolve({
                ...extract,
                imageQualityStatus,
                percentComplete: extract.extractDone
                    ? 100
                    : (encodedData.byteLength * 100) / totalBytes,
            });
        }
        catch (err) {
            errorInterceptor(err);
            console.error(err);
            reject(err);
        }
    });
    return promise;
}
async function fetchRangeAndAppend(url, headers, range, streamingData) {
    if (range) {
        headers = Object.assign(headers, {
            Range: `bytes=${range[0]}-${range[1]}`,
        });
    }
    let { encodedData } = streamingData;
    if (range[1] && encodedData?.byteLength > range[1]) {
        return streamingData;
    }
    const response = await fetch(url, {
        headers,
        signal: undefined,
    });
    const responseArrayBuffer = await response.arrayBuffer();
    const responseTypedArray = new Uint8Array(responseArrayBuffer);
    const { status } = response;
    let newByteArray;
    if (encodedData) {
        newByteArray = new Uint8Array(encodedData.length + responseTypedArray.length);
        newByteArray.set(encodedData, 0);
        newByteArray.set(responseTypedArray, encodedData.length);
        streamingData.rangesFetched = 1;
    }
    else {
        newByteArray = new Uint8Array(responseTypedArray.length);
        newByteArray.set(responseTypedArray, 0);
        streamingData.rangesFetched++;
    }
    streamingData.encodedData = encodedData = newByteArray;
    streamingData.responseHeaders = response.headers;
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
        streamingData.totalBytes = Number(contentRange.split('/')[1]);
    }
    else if (status !== 206 || !range) {
        streamingData.totalBytes = encodedData?.byteLength;
    }
    else if (range[1] === '' || encodedData?.length < range[1]) {
        streamingData.totalBytes = encodedData.byteLength;
    }
    else {
        streamingData.totalBytes = Number.MAX_SAFE_INTEGER;
    }
    return streamingData;
}
function getValue(imageId, src, attr) {
    const value = src[attr];
    if (typeof value !== 'function') {
        return value;
    }
    const metaData = metaDataManager.get(imageId);
    return value(metaData, imageId);
}
function getByteRange(streamingData, retrieveOptions) {
    const { totalBytes, encodedData, chunkSize = 65536 } = streamingData;
    const { rangeIndex = 0 } = retrieveOptions;
    if (rangeIndex === -1 && (!totalBytes || !encodedData)) {
        return [0, ''];
    }
    if (rangeIndex === -1 || encodedData?.byteLength > totalBytes - chunkSize) {
        return [encodedData?.byteLength || 0, ''];
    }
    return [encodedData?.byteLength || 0, chunkSize * (rangeIndex + 1) - 1];
}
