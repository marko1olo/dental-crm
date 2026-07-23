import * as Comlink from 'comlink';
import { RequestType } from '../enums';
import { RequestPoolManager } from '../requestPool/requestPoolManager';
export type WebWorkerManagerOptions = {
    maxWorkerInstances?: number;
    overwrite?: boolean;
    autoTerminateOnIdle?: {
        enabled?: boolean;
        idleTimeThreshold?: number;
    };
};
type WebWorkerProperties = {
    workerFn: () => Worker;
    instances: Comlink.Remote<unknown>[];
    loadCounters: number[];
    lastActiveTime: (number | null)[];
    nativeWorkers: Worker[];
    autoTerminateOnIdle: boolean;
    idleCheckIntervalId: NodeJS.Timeout | null;
    idleTimeThreshold: number;
    processing?: boolean;
};
declare class CentralizedWorkerManager {
    workerRegistry: Record<string, WebWorkerProperties>;
    workerPoolManager: RequestPoolManager;
    registerWorker(workerName: string, workerFn: () => Worker, options?: WebWorkerManagerOptions): void;
    getNextWorkerAPI(workerName: string): {
        api: Comlink.Remote<unknown>;
        index: number;
    };
    executeTask<WorkerFnReturnType = any>(workerName: string, methodName: string, args?: {}, { requestType, priority, options, callbacks, }?: {
        requestType?: RequestType;
        priority?: number;
        options?: {};
        callbacks?: any[];
    }): Promise<WorkerFnReturnType>;
    terminateIdleWorkers(workerName: string, idleTimeThreshold: number): void;
    terminate(workerName: string): void;
    terminateWorkerInstance(workerName: any, index: any): void;
}
export default CentralizedWorkerManager;
