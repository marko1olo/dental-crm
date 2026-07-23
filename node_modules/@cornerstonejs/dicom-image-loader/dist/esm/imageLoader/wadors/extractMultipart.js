import { Enums } from '@cornerstonejs/core';
import findIndexOfString from './findIndexOfString';
const { ImageQualityStatus } = Enums;
export default function extractMultipart(contentType, imageFrameAsArrayBuffer, options) {
    options ||= {};
    const response = new Uint8Array(imageFrameAsArrayBuffer);
    const isPartial = !!options?.isPartial;
    if (contentType.indexOf('multipart') === -1) {
        return {
            contentType,
            imageQualityStatus: isPartial
                ? ImageQualityStatus.SUBRESOLUTION
                : ImageQualityStatus.FULL_RESOLUTION,
            pixelData: response,
        };
    }
    let { tokenIndex, responseHeaders, boundary, multipartContentType } = options;
    tokenIndex ||= findIndexOfString(response, '\r\n\r\n');
    if (tokenIndex === -1) {
        throw new Error('invalid response - no multipart mime header');
    }
    if (!boundary) {
        const header = uint8ArrayToString(response, 0, tokenIndex);
        responseHeaders = header.split('\r\n');
        boundary = findBoundary(responseHeaders);
        if (!boundary) {
            throw new Error('invalid response - no boundary marker');
        }
    }
    const offset = tokenIndex + 4;
    const endIndex = findIndexOfString(response, boundary, offset);
    if (endIndex === -1 && !isPartial) {
        throw new Error('invalid response - terminating boundary not found');
    }
    multipartContentType ||= findContentType(responseHeaders);
    options.tokenIndex = tokenIndex;
    options.boundary = boundary;
    options.responseHeaders = responseHeaders;
    options.multipartContentType = multipartContentType;
    options.isPartial = endIndex === -1;
    return {
        contentType: multipartContentType,
        extractDone: !isPartial || endIndex !== -1,
        tokenIndex,
        responseHeaders,
        boundary,
        multipartContentType,
        pixelData: imageFrameAsArrayBuffer.slice(offset, endIndex - 2),
    };
}
export function findBoundary(header) {
    for (let i = 0; i < header.length; i++) {
        if (header[i].substr(0, 2) === '--') {
            return header[i];
        }
    }
}
export function findContentType(header) {
    for (let i = 0; i < header.length; i++) {
        if (header[i].substr(0, 13) === 'Content-Type:') {
            return header[i].substr(13).trim();
        }
    }
}
export function uint8ArrayToString(data, offset, length) {
    offset = offset || 0;
    length = length || data.length - offset;
    let str = '';
    for (let i = offset; i < offset + length; i++) {
        str += String.fromCharCode(data[i]);
    }
    return str;
}
