/**
 * fiscalReceiptQueueService.ts — Facade preserving FiscalQueueRetryWorker & FiscalReceiptQueueService.
 * Delegates implementation to ./queueModules/.
 */

import { FiscalQueueRetryWorker } from "./queueModules/fiscalQueueWorker.js";

export { FiscalQueueRetryWorker };
export const FiscalReceiptQueueService = FiscalQueueRetryWorker;
