import { default as xhrRequest } from './xhrRequest';
import { default as streamRequest } from './streamRequest';
import { setOptions, getOptions } from './options';
declare const internal: {
    xhrRequest: typeof xhrRequest;
    streamRequest: typeof streamRequest;
    setOptions: typeof setOptions;
    getOptions: typeof getOptions;
};
export { setOptions, getOptions, xhrRequest, internal, streamRequest };
