/**
 * remdApiSubmissions.ts — API submission methods for EGISZ REMD and FNS tax gateway.
 * Mandate 8b compliant (<= 120 lines).
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { EgiszClinicInfo } from "../egiszRemdEngine";
import { type RemdDocumentRecord, mapOutboxRowToRemdRecord } from "../egiszJournalData";
import type { SubmitCdaPackageOptions, SubmitFnsTaxOptions } from "./packageSenderTypes";

export async function fetchOutboxRecordsFromBackend(
	clinic: EgiszClinicInfo,
): Promise<RemdDocumentRecord[]> {
	const endpoints = ["/api/egisz/journal", "/api/egisz/outbox", "/api/clinical/egisz/outbox"];
	for (const endpoint of endpoints) {
		try {
			const res = await fetch(endpoint, { headers: denteAdminSecretRequestHeaders() });
			if (!res.ok) continue;
			const data = (await res.json()) as { items?: unknown[]; success?: boolean } | unknown[];
			const rawItems = Array.isArray(data) ? data : data.items || [];
			if (Array.isArray(rawItems)) {
				return rawItems.map((item) => mapOutboxRowToRemdRecord(item, clinic));
			}
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
}: SubmitCdaPackageOptions): Promise<string> {
	const cleanPatientSnils = (semdPayload.patient.patientSnils || "").replace(/\D/g, "");
	const effectiveVisitId = semdPayload.documentUuid?.replace(/^urn:uuid:/, "") || `VISIT-${Date.now()}`;
	const sigEntry = (sig: typeof doctorSig) => sig ? {
		signatureBase64: sig.signatureBase64,
		certificateSerialNumber: sig.certificateSerialNumber,
		certificateSubject: sig.certificateSubject,
		signedAt: sig.signedAt || new Date().toISOString(),
		algorithmOid: sig.algorithmOid || "1.2.643.7.1.1.1.1",
	} : undefined;

	const packageBody = {
		cdaXml: generatedXml,
		doctorSignature: sigEntry(doctorSig),
		...(moSig ? { clinicSignature: sigEntry(moSig), moSignature: sigEntry(moSig) } : {}),
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
		const errMsg = errJson?.message || errJson?.error || `Шлюз РЭМД ЕГИСЗ вернул ошибку (${res.status} ${res.statusText})`;
		throw new Error(errMsg);
	}

	const data = (await res.json()) as { regNumber?: string; transactionId?: string; outboxId?: string };
	return data.regNumber || data.transactionId || data.outboxId || "РЕГ-РЭМД-ПРИНЯТО";
}

export async function submitFnsTaxToGateway({
	patientId,
	visitId,
}: SubmitFnsTaxOptions): Promise<string> {
	const res = await fetch("/api/egisz/send", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({ patientId, visitId }),
	});

	if (!res.ok) {
		const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
		const errMsg = errJson?.message || errJson?.error || `Шлюз ФНС вернул ошибку (${res.status} ${res.statusText})`;
		throw new Error(errMsg);
	}

	const data = (await res.json()) as { logId?: string };
	return data.logId || `FNS-${Date.now()}`;
}
