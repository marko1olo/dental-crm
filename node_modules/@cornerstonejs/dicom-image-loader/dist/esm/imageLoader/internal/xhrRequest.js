import { getOptions } from './options';
import { triggerEvent, eventTarget } from '@cornerstonejs/core';
function xhrRequest(url, imageId, defaultHeaders = {}, params = {}) {
    const options = getOptions();
    const errorInterceptor = (xhr) => {
        if (typeof options.errorInterceptor === 'function') {
            const error = new Error('request failed');
            error.request = xhr;
            error.response = xhr.response;
            error.status = xhr.status;
            options.errorInterceptor(error);
        }
    };
    const xhr = new XMLHttpRequest();
    const promise = new Promise(async (resolve, reject) => {
        options.open(xhr, url, defaultHeaders, params);
        const beforeSendHeaders = await options.beforeSend(xhr, imageId, defaultHeaders, params);
        xhr.responseType = 'arraybuffer';
        const headers = Object.assign({}, defaultHeaders, beforeSendHeaders);
        Object.keys(headers).forEach(function (key) {
            if (headers[key] === null) {
                return;
            }
            if (key === 'Accept' && url.indexOf('accept=') !== -1) {
                return;
            }
            xhr.setRequestHeader(key, headers[key]);
        });
        params.deferred = {
            resolve,
            reject,
        };
        params.url = url;
        params.imageId = imageId;
        xhr.onloadstart = function (event) {
            if (options.onloadstart) {
                options.onloadstart(event, params);
            }
            const eventData = {
                url,
                imageId,
            };
            triggerEvent(eventTarget, 'cornerstoneimageloadstart', eventData);
        };
        xhr.onloadend = function (event) {
            if (options.onloadend) {
                options.onloadend(event, params);
            }
            const eventData = {
                url,
                imageId,
            };
            triggerEvent(eventTarget, 'cornerstoneimageloadend', eventData);
        };
        xhr.onreadystatechange = function (event) {
            if (options.onreadystatechange) {
                options.onreadystatechange(event, params);
            }
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 206) {
                    options
                        .beforeProcessing(xhr)
                        .then(resolve)
                        .catch(() => {
                        errorInterceptor(xhr);
                        reject(xhr);
                    });
                }
                else {
                    errorInterceptor(xhr);
                    reject(xhr);
                }
            }
        };
        xhr.onprogress = function (oProgress) {
            const loaded = oProgress.loaded;
            let total;
            let percentComplete;
            if (oProgress.lengthComputable) {
                total = oProgress.total;
                percentComplete = Math.round((loaded / total) * 100);
            }
            const eventData = {
                url,
                imageId,
                loaded,
                total,
                percentComplete,
            };
            triggerEvent(eventTarget, 'cornerstoneimageloadprogress', eventData);
            if (options.onprogress) {
                options.onprogress(oProgress, params);
            }
        };
        xhr.onerror = function () {
            errorInterceptor(xhr);
            reject(xhr);
        };
        xhr.onabort = function () {
            errorInterceptor(xhr);
            reject(xhr);
        };
        xhr.send();
    });
    promise.xhr = xhr;
    return promise;
}
export default xhrRequest;
