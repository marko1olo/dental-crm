import { utilities } from '@cornerstonejs/core';
import { getOptions } from './options';
import extractMultipart from '../wadors/extractMultipart';
import { getImageQualityStatus } from '../wadors/getImageQualityStatus';
const { ProgressiveIterator } = utilities;
export default function streamRequest(url, imageId, defaultHeaders = {}, options = {}) {
    const globalOptions = getOptions();
    const { retrieveOptions = {}, streamingData = {}, } = options;
    const minChunkSize = retrieveOptions.minChunkSize || 128 * 1024;
    const errorInterceptor = (err) => {
        if (typeof globalOptions.errorInterceptor === 'function') {
            const error = new Error('request failed');
            globalOptions.errorInterceptor(error);
        }
    };
    const loadIterator = new ProgressiveIterator('streamRequest');
    loadIterator.generate(async (iterator, reject) => {
        const beforeSendHeaders = await globalOptions.beforeSend?.(null, url, defaultHeaders, {});
        const headers = Object.assign({}, defaultHeaders, beforeSendHeaders);
        Object.keys(headers).forEach(function (key) {
            if (headers[key] === null) {
                headers[key] = undefined;
            }
            if (key === 'Accept' && url.indexOf('accept=') !== -1) {
                headers[key] = undefined;
            }
        });
        try {
            const response = await fetch(url, {
                headers,
                signal: undefined,
            });
            if (response.status !== 200) {
                throw new Error(`Couldn't retrieve ${url} got status ${response.status}`);
            }
            const responseReader = response.body.getReader();
            const responseHeaders = response.headers;
            const contentType = responseHeaders.get('content-type');
            const totalBytes = Number(responseHeaders.get('Content-Length'));
            let readDone = false;
            let encodedData = streamingData.encodedData;
            let lastSize = streamingData.lastSize || 0;
            streamingData.isPartial = true;
            while (!readDone) {
                const { done, value } = await responseReader.read();
                encodedData = appendChunk(encodedData, value);
                if (!encodedData) {
                    if (readDone) {
                        throw new Error(`Done but no image frame available ${imageId}`);
                    }
                    continue;
                }
                readDone = done || encodedData.byteLength === totalBytes;
                if (!readDone && encodedData.length < lastSize + minChunkSize) {
                    continue;
                }
                lastSize = encodedData.length;
                streamingData.isPartial = !done;
                const extracted = extractMultipart(contentType, encodedData, streamingData);
                const imageQualityStatus = getImageQualityStatus(retrieveOptions, readDone);
                const detail = {
                    url,
                    imageId,
                    ...extracted,
                    percentComplete: done
                        ? 100
                        : (extracted.pixelData?.length * 100) / totalBytes,
                    imageQualityStatus,
                    done: readDone,
                };
                iterator.add(detail, readDone);
            }
        }
        catch (err) {
            errorInterceptor(err);
            console.error(err);
            reject(err);
        }
    });
    return loadIterator.getNextPromise();
}
function appendChunk(existing, chunk) {
    if (!existing) {
        return chunk;
    }
    if (!chunk) {
        return existing;
    }
    const newDataArray = new Uint8Array(existing.length + chunk.length);
    newDataArray.set(existing, 0);
    newDataArray.set(chunk, existing.length);
    return newDataArray;
}
