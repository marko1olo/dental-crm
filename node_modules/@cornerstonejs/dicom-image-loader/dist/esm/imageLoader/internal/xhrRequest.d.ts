import type { LoaderXhrRequestParams, LoaderXhrRequestPromise } from '../../types';
declare function xhrRequest(url: string, imageId: string, defaultHeaders?: Record<string, string>, params?: LoaderXhrRequestParams): LoaderXhrRequestPromise<ArrayBuffer>;
export default xhrRequest;
