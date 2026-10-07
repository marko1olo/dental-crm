/**
 * egiszPackageSender.ts
 *
 * Statutory EGISZ REMD and FNS Network Transmission & ZIP Export Utilities.
 * Order 947n, Order ED-7-11/755@, and Federal Law 63-FZ.
 */

import { strToU8, zipSync } from "fflate";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type GostSignatureInfo,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
} from "./egiszRemdEngine";
import {
	type RemdDocumentRecord,
	mapOutboxRowToRemdRecord,
} from "./egiszJournalData";

export interface PackageZipExportOptions {
	readonly filenamePrefix: string;
	readonly generatedXml: string;
	readonly doctorSigBase64?: string | undefined;
	readonly moSigBase64?: string | undefined;
	readonly registrationInfo?: unknown | undefined;
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
		const zipped = zipSync(zipData);
		const blob = new Blob([zipped], { type: "application/zip" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${filenamePrefix}_package.zip`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
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
		const zipped = zipSync(zipData);
		const blob = new Blob([zipped], { type: "application/zip" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `remd_batch_export_${Date.now()}.zip`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast("Пакетный ZIP-архив сформирован", "success");
	} catch (e: unknown) {
		showToast(`Ошибка формирования пакетного ZIP: ${e instanceof Error ? e.message : String(e)}`, "error");
	}
}

export function buildDeferredRemdRecord({
	docType,
	semdDocCode,
	patient,
	doctor,
	clinic,
	semdPayload,
	taxPatientName,
	taxPatientSnils,
}: {
	readonly docType: "cda_semd" | "fns_tax";
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly patient: EgiszPatientInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly clinic: EgiszClinicInfo;
	readonly semdPayload: EgiszDentalCdaPayload;
	readonly taxPatientName: string;
	readonly taxPatientSnils: string;
}): RemdDocumentRecord {
	const nowIso = new Date().toISOString();
	return {
		id: `REMD-DEF-${Date.now()}`,
		documentUuid: `UUID-DEF-${Date.now()}`,
		docTypeCode: docType === "cda_semd" ? semdDocCode : "1151156",
		docTypeName:
			docType === "cda_semd"
				? "Стоматологический протокол (СЭМД)"
				: "Справка об оплате мед. услуг для ФНС",
		createdAt: nowIso,
		updatedAt: nowIso,
		encounterDate: nowIso.slice(0, 10),
		status: "draft",
		patient: {
			id: patient.patientId || `PAT-${Date.now()}`,
			fullName: docType === "cda_semd" ? patient.patientFullName : taxPatientName,
			snils: docType === "cda_semd" ? patient.patientSnils : taxPatientSnils,
			birthDate: patient.patientBirthDate || "1990-01-01",
			cardNumber: patient.cardNumber || "043/у",
			polisOms: patient.patientPolisOms,
		},
		doctor: {
			id: `DOC-${doctor.doctorSnils || Date.now()}`,
			fullName: doctor.doctorFullName,
			snils: doctor.doctorSnils,
			position: doctor.doctorPosition,
			specialty: "Стоматолог",
		},
		clinic: {
			name: clinic.clinicName,
			oid: clinic.clinicOid,
			ogrn: clinic.clinicOgrn,
			inn: clinic.clinicInn,
		},
		cdaPayload: semdPayload,
	};
}

export async function fetchOutboxRecordsFromBackend(
	clinic: EgiszClinicInfo,
): Promise<RemdDocumentRecord[]> {
	const endpoints = [
		"/api/egisz/journal",
		"/api/egisz/outbox",
		"/api/clinical/egisz/outbox",
	];

	for (const endpoint of endpoints) {
		try {
			const res = await fetch(endpoint, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) continue;

			const data = (await res.json()) as
				| { items?: unknown[]; success?: boolean }
				| unknown[];
			const rawItems = Array.isArray(data) ? data : data.items || [];
			if (!Array.isArray(rawItems)) continue;

			return rawItems.map((item) => mapOutboxRowToRemdRecord(item, clinic));
		} catch {
			// Try fallback endpoint
		}
	}

	return [];
}

export async function submitCdaPackageToRemd({
	semdPayload,
	generatedXml,
	doctorSig,
	moSig,
}: {
	readonly semdPayload: EgiszDentalCdaPayload;
	readonly generatedXml: string;
	readonly doctorSig?: GostSignatureInfo | undefined;
	readonly moSig?: GostSignatureInfo | undefined;
}): Promise<string> {
	const cleanPatientSnils = (semdPayload.patient.patientSnils || "").replace(/\D/g, "");
	const effectiveVisitId = semdPayload.documentUuid?.replace(/^urn:uuid:/, "") || `VISIT-${Date.now()}`;
	const packageBody = {
		cdaXml: generatedXml,
		doctorSignature: doctorSig
			? {
					signatureBase64: doctorSig.signatureBase64,
					certificateSerialNumber: doctorSig.certificateSerialNumber,
					certificateSubject: doctorSig.certificateSubject,
					signedAt: doctorSig.signedAt || new Date().toISOString(),
					algorithmOid: doctorSig.algorithmOid || "1.2.643.7.1.1.1.1",
				}
			: undefined,
		...(moSig
			? {
					clinicSignature: {
						signatureBase64: moSig.signatureBase64,
						certificateSerialNumber: moSig.certificateSerialNumber,
						certificateSubject: moSig.certificateSubject,
						signedAt: moSig.signedAt || new Date().toISOString(),
						algorithmOid: moSig.algorithmOid || "1.2.643.7.1.1.1.1",
					},
					moSignature: {
						signatureBase64: moSig.signatureBase64,
						certificateSerialNumber: moSig.certificateSerialNumber,
						certificateSubject: moSig.certificateSubject,
						signedAt: moSig.signedAt || new Date().toISOString(),
						algorithmOid: moSig.algorithmOid || "1.2.643.7.1.1.1.1",
					},
				}
			: {}),
		docType: String(semdPayload.docTypeCode || "108"),
		patientId: cleanPatientSnils || "patient",
		visitId: effectiveVisitId,
		documentId: effectiveVisitId,
		documentVersion: semdPayload.documentVersion || 1,
		xmlCanonicalPayload: generatedXml,
		metadata: {
			patientSnils: cleanPatientSnils,
			clinicOid: semdPayload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2.77.8432",
			...(semdPayload.clinic.clinicOgrn ? { clinicOgrn: semdPayload.clinic.clinicOgrn } : {}),
			docTypeNsiCode: String(semdPayload.docTypeCode || "108"),
		},
	};

	const res = await fetch("/api/egisz/packages", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify(packageBody),
	});

	if (!res.ok) {
		const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
		const errMsg =
			errJson?.message ||
			errJson?.error ||
			`Шлюз РЭМД ЕГИСЗ вернул ошибку (${res.status} ${res.statusText})`;
		throw new Error(errMsg);
	}

	const data = (await res.json()) as {
		regNumber?: string;
		transactionId?: string;
		outboxId?: string;
	};

	return data.regNumber || data.transactionId || data.outboxId || "РЕГ-РЭМД-ПРИНЯТО";
}

export async function submitFnsTaxToGateway({
	patientId,
	visitId,
}: {
	readonly patientId: string;
	readonly visitId: string;
}): Promise<string> {
	const res = await fetch("/api/egisz/send", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({ patientId, visitId }),
	});

	if (!res.ok) {
		const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
		const errMsg =
			errJson?.message ||
			errJson?.error ||
			`Шлюз ФНС вернул ошибку (${res.status} ${res.statusText})`;
		throw new Error(errMsg);
	}

	const data = (await res.json()) as { logId?: string };
	return data.logId || `FNS-${Date.now()}`;
}
