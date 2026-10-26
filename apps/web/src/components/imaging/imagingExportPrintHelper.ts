/**
 * DENTE CRM — Fast 2D Image Export & Medical Print Protocol Helper
 * Mandates 8e, 8n, 8x, 8am.
 * 1-click JPG/PNG download & clean A4 print for patient without external bloat.
 * Mandate 8b: строго <= 120 строк.
 */

export { downloadStudyImageAsJpg } from "./exportModal/imagingDownloadHelper.js";
export {
	printStudyForPatient,
	type PrintStudyParams,
} from "./exportModal/imagingPrintTemplate.js";
