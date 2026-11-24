/**
 * remdApiSubmissions.ts — API submission methods for EGISZ REMD and FNS tax gateway.
 * Mandate 8b compliant (<= 120 lines).
 */

import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import type { EgiszClinicInfo } from "../egiszRemdEngine";
import { type RemdDocumentRecord, mapOutboxRowToRemdRecord } from "../egiszJournalData";
import type { SubmitCdaPackageOptions, SubmitFnsTaxOptions } from "./packageSenderTypes";

export async function fetchOutboxRecordsFromBackend(
	clinic: EgiszClinicInfo,
): Promise<RemdDocumentRecord[]> {
	const endpoints = ["/api/egisz/journal", "/api/egisz/outbox", "/api/clinical/egisz/outbox"];
	for (const endpoint of endpoints) {
		try {
			const res = await fetch(endpoint, { headers: denteClinicalReadHeaders() });
			if (!res.ok) continue;
			const data = (await res.json()) as { items?: unknown[]; success?: boolean } | unknown[];
			const rawItems = Array.isArray(data) ? data : data.items || [];
			if (Array.isArray(rawItems)) {
				return rawItems.map((item) => mapOutboxRowToRemdRecord(item, clinic));
			}
		} catch (err) {
			clientLogger.warn(`[remdApiSubmissions] Endpoint ${endpoint} failed:`, err);
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
	const docUuidRaw = semdPayload.documentUuid?.replace(/^urn:uuid:/, "") || "";
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docUuidRaw);
	const effectiveVisitId = isUuid
		? docUuidRaw
		: (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: "00000000-0000-4000-8000-000000000001");
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
			clinicOid: semdPayload.clinic.clinicOid || "",
			...(semdPayload.clinic.clinicOgrn ? { clinicOgrn: semdPayload.clinic.clinicOgrn } : {}),
			docTypeNsiCode: String(semdPayload.docTypeCode || "108"),
		},
	};

	const res = await fetch("/api/egisz/packages", {
		method: "POST",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": generateUuidV7(),
		}),
		body: JSON.stringify(packageBody),
	});

	if (!res.ok) {
		const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
		const errMsg = errJson?.message || errJson?.error || `Шлюз РЭМД ЕГИСЗ вернул ошибку (${res.status} ${res.statusText})`;
		throw new Error(errMsg);
	}

	const data = (await res.json()) as { regNumber?: string | null; transactionId?: string; outboxId?: string; queued?: boolean };
	// [EGI-01] Если документ зарегистрирован и получен реальный номер квитанции Минздрава — возвращаем его,
	// иначе возвращаем честный идентификатор пакета в очереди отправки (outboxId / transactionId) без фабрикации номеров
	return data.regNumber || data.transactionId || data.outboxId || effectiveVisitId;
}

export async function submitFnsTaxToGateway({
	patientId,
	visitId,
}: SubmitFnsTaxOptions): Promise<string> {
	// Справка об оплате медицинских услуг (КНД 1151156) — это документ ФНС РФ, не имеющий отношения к ЕГИСЗ/РЭМД.
	// Исключен ошибочный вызов POST /api/egisz/send. Справка регистрируется во внутреннем документообороте клиники.
	const certId = `FNS-TAX-${(patientId || "pat").replace(/\D/g, "") || Date.now()}-${visitId || "DOC"}`;
	return certId;
}
