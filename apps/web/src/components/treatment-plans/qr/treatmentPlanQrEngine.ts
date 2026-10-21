/**
 * apps/web/src/components/treatment-plans/qr/treatmentPlanQrEngine.ts
 *
 * Автономный легковесный генератор QR-кодов (SVG / Matrix) без внешних зависимостей.
 */

export type {
	QrErrorCorrectionLevel,
	PlanVerificationQrPayloadData,
	QrMatrixResult,
} from "./qrTypes";

export { generateQrMatrix } from "./qrMatrixGenerator";
export { generateQrSvgString, type QrSvgOptions } from "./qrSvgGenerator";
export { generatePlanVerificationQrPayload } from "./planVerificationPayload";
