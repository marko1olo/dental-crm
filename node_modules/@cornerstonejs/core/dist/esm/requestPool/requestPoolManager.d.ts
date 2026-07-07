import RequestType from '../enums/RequestType';
import type { IImage } from '../types';
interface AdditionalDetails {
    imageId?: string;
    volumeId?: string;
}
interface RequestDetailsInterface {
    requestFn: () => Promise<IImage | void>;
    type: RequestType;
    additionalDetails: AdditionalDetails;
}
type RequestPool = {
    [name in RequestType]: Record<number, RequestDetailsInterface[]>;
};
declare class RequestPoolManager {
    private id;
    private awake;
    private requestPool;
    private numRequests;
    maxNumRequests: {
        [RequestType.Interaction]: number;
        [RequestType.Thumbnail]: number;
        [RequestType.Prefetch]: number;
        [RequestType.Compute]: number;
    };
    grabDelay: number;
    private timeoutHandle;
    constructor(id?: string);
    setMaxSimultaneousRequests(type: RequestType, maxNumRequests: number): void;
    getMaxSimultaneousRequests(type: RequestType): number;
    destroy(): void;
    addRequest(requestFn: () => Promise<IImage | void>, type: RequestType, additionalDetails: Record<string, unknown>, priority?: number): void;
    filterRequests(filterFunction: (requestDetails: RequestDetailsInterface) => boolean): void;
    clearRequestStack(type: string): void;
    private sendRequests;
    private getNextRequest;
    protected startGrabbing(): void;
    protected startAgain(): void;
    protected getSortedPriorityGroups(type: string): number[];
    getRequestPool(): RequestPool;
}
export { RequestPoolManager };
