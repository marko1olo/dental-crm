/**
 * egiszFilenames.ts — Standardized EGISZ SEMD and FNS Tax XML Filename generators
 */

import { formatHl7DateTime } from "@dental/shared/cda";
import type { EgiszDentalCdaPayload, FnsTaxCertificatePayload } from "../cdaR2XmlBuilder";

export function generateEgiszXmlFilename(payload: EgiszDentalCdaPayload): string {
	const docCode = payload.docTypeCode || "105";
	const cleanOid = (payload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2").replace(/[^\d.]/g, "_");
	const dateStr = formatHl7DateTime(payload.encounterDate || new Date(), false);
	const docId = (payload.patient.cardNumber || "DOC").replace(/[^\w-]/g, "_");
	return `SEMD_${docCode}_${cleanOid}_${dateStr}_${docId}.xml`;
}

export function generateFnsTaxXmlFilename(payload: FnsTaxCertificatePayload): string {
	const inn = (payload.clinic.inn || "0000000000").trim();
	const docDate = payload.documentDate instanceof Date ? payload.documentDate : new Date(payload.documentDate);
	const validDate = Number.isNaN(docDate.getTime()) ? new Date() : docDate;
	const dateStr = `${validDate.getFullYear()}${(validDate.getMonth() + 1).toString().padStart(2, "0")}${validDate.getDate().toString().padStart(2, "0")}`;
	const docNum = (payload.documentNumber || "1").replace(/[^\w-]/g, "_");
	return `UT_SPROPLMED_${inn}_${dateStr}_${docNum}.xml`;
}
