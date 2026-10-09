/**
 * DicomCrawlerDaemon.ts — Канонический фасад демона поиска и авто-распаковки КТ / DICOM.
 * Монолит (1,455 строк) полностью декомпозирован в ./crawler/ по DAG архитектуре.
 */

export {
	DicomCrawlerDaemon,
	dicomCrawlerDaemon,
} from "./crawler/index.js";

export type * from "./crawler/types.js";
