/**
 * deferredRemdRecord.ts — Builds deferred REMD document records for background outbox queue.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { RemdDocumentRecord } from "../egiszJournalData";
import type { BuildDeferredRemdOptions } from "./packageSenderTypes";

export function buildDeferredRemdRecord({
	docType,
	semdDocCode,
	patient,
	doctor,
	clinic,
	semdPayload,
	taxPatientName,
	taxPatientSnils,
}: BuildDeferredRemdOptions): RemdDocumentRecord {
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
