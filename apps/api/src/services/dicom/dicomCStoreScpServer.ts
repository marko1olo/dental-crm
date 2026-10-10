/**
 * dicomCStoreScpServer.ts — Канонический тонкий фасад сервера DICOM C-STORE SCP (PS 3.8 / PS 3.7).
 * Монолит полностью декомпозирован в поддиректорию ./cstoreScp/ по модульной DAG-архитектуре.
 */

export type {
	DicomScpServerOptions,
	DicomScpServerStats,
} from "./cstoreScp/index.js";

export {
	DicomCStoreScpServer,
	dicomCStoreScpServer,
	wrapInDicomPart10,
} from "./cstoreScp/index.js";
