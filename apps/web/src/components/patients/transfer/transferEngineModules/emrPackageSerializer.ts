/**
 * emrPackageSerializer.ts — Тонкий фасад сериализации EMR пакетов по Мандату 8b (лимит <= 25 строк).
 */

export { createPatientBranchTransferConsent } from "./transferConsent.js";
export {
	generateTransferVerificationQrPayload,
	generateTransferVerificationQrMatrix,
	generateTransferVerificationQrSvg,
	generateTransferVerificationQrDataUri,
} from "./transferQrVerification.js";
export { buildPatientClinicalSnapshot } from "./transferSnapshotBuilder.js";
export { generateTransferActHtml } from "./transferActHtmlGenerator.js";
export { generateTransferActCsv } from "./transferActCsvGenerator.js";
