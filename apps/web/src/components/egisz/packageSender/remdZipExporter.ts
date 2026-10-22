/**
 * remdZipExporter.ts — Statutory single and batch ZIP package generation for EGISZ REMD.
 * Mandate 8b compliant (<= 120 lines).
 */

import { strToU8, zipSync } from "fflate";
import { showToast } from "../../GlobalToast";
import {
	SAMPLE_DENTAL_SEMD_105_PRESET,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
} from "../egiszRemdEngine";
import type { RemdDocumentRecord } from "../egiszJournalData";
import type { PackageZipExportOptions } from "./packageSenderTypes";

function triggerBlobDownload(zipped: Uint8Array, filename: string): void {
	const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function exportSingleDocumentZip({
	filenamePrefix,
	generatedXml,
	doctorSigBase64,
	moSigBase64,
	registrationInfo,
}: PackageZipExportOptions): void {
	try {
		const zipData: Record<string, Uint8Array> = {
			[`${filenamePrefix}.xml`]: strToU8(generatedXml),
		};
		if (doctorSigBase64) {
			zipData[`${filenamePrefix}_doctor.p7s`] = strToU8(doctorSigBase64);
		}
		if (moSigBase64) {
			zipData[`${filenamePrefix}_clinic.p7s`] = strToU8(moSigBase64);
		}
		if (registrationInfo) {
			zipData[`${filenamePrefix}_receipt.json`] = strToU8(
				JSON.stringify(registrationInfo, null, 2),
			);
		}
		triggerBlobDownload(zipSync(zipData), `${filenamePrefix}_package.zip`);
		showToast(`Пакетный архив ${filenamePrefix}_package.zip сохранен`, "success");
	} catch (e: unknown) {
		showToast(`Ошибка формирования архива: ${e instanceof Error ? e.message : String(e)}`, "error");
	}
}

export function exportBatchDocumentsZip(records: readonly RemdDocumentRecord[]): void {
	try {
		const zipData: Record<string, Uint8Array> = {};
		records.forEach((record, i) => {
			const payload = record.cdaPayload || SAMPLE_DENTAL_SEMD_105_PRESET;
			const xml = generateEgiszDentalCdaXml({
				...payload,
				doctorSignature: record.doctorSignature,
			});
			const filenamePrefix = `${generateEgiszXmlFilename(payload).replace(".xml", "")}_${i + 1}`;
			zipData[`${filenamePrefix}.xml`] = strToU8(xml);
			if (record.doctorSignature?.signatureBase64) {
				zipData[`${filenamePrefix}_doctor.p7s`] = strToU8(record.doctorSignature.signatureBase64);
			}
			const moSigBase64 = record.clinicSignature?.signatureBase64 || record.moSignature?.signatureBase64;
			if (moSigBase64) {
				zipData[`${filenamePrefix}_clinic.p7s`] = strToU8(moSigBase64);
			}
			if (record.registrationInfo) {
				zipData[`${filenamePrefix}_receipt.json`] = strToU8(
					JSON.stringify(record.registrationInfo, null, 2),
				);
			}
		});
		triggerBlobDownload(zipSync(zipData), `remd_batch_export_${Date.now()}.zip`);
		showToast("Пакетный ZIP-архив сформирован", "success");
	} catch (e: unknown) {
		showToast(`Ошибка формирования пакетного ZIP: ${e instanceof Error ? e.message : String(e)}`, "error");
	}
}
