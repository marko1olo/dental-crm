import type { MdlpCarpuleBatch, MdlpCarpuleQueueItem, MdlpCarpuleQueueStats, MdlpDisposalParams } from "./types.js";
/**
 * Creates a queue item from raw DataMatrix barcode or pre-parsed fields.
 */
export declare function createCarpuleQueueItem(rawBarcode: string, options?: {
    id?: string | undefined;
    costRub?: number | null | undefined;
    patientId?: string | null | undefined;
    patientName?: string | null | undefined;
    visitId?: string | null | undefined;
    doctorId?: string | null | undefined;
    doctorName?: string | null | undefined;
    cabinetId?: string | null | undefined;
    referenceDate?: Date | undefined;
}): MdlpCarpuleQueueItem;
/**
 * Sorts carpule queue items by FEFO (First Expired, First Out) principle.
 * Items with earliest expiration dates come first; expired items top priority for disposal.
 */
export declare function sortQueueByFefo(items: readonly MdlpCarpuleQueueItem[]): MdlpCarpuleQueueItem[];
/**
 * Groups carpules in queue by drug and series/lot for batch verification.
 */
export declare function groupQueueByBatch(items: readonly MdlpCarpuleQueueItem[]): readonly MdlpCarpuleBatch[];
/**
 * Calculates aggregate statistics for a carpule write-off queue.
 */
export declare function calculateQueueStats(items: readonly MdlpCarpuleQueueItem[]): MdlpCarpuleQueueStats;
/**
 * Validates a list of queue items before writing off.
 * Flags duplicates, missing SGTINs, and expired items if not explicitly allowed.
 */
export declare function validateQueueForDisposal(items: readonly MdlpCarpuleQueueItem[], allowExpired?: boolean): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Builds MdlpDisposalParams for Schema 10560 payload generation from queue items.
 */
export declare function buildDisposalParamsFromQueue(options: {
    subjectId: string;
    docNum: string;
    docDate: string;
    items: readonly MdlpCarpuleQueueItem[];
    patientId?: string | null;
    visitId?: string | null;
    doctorId?: string | null;
    notes?: string | null;
    operationDate?: string | Date;
}): MdlpDisposalParams;
