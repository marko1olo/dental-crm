/**
 * apps/api/src/services/cda/validator.ts
 *
 * Facade delegating CDA parameter validation to canonical @dental/shared/cda per Mandate 8s.
 */

export * from "@dental/shared/cda";
import {
	validateCdaParams as canonicalValidateCdaParams,
	validateFdiToothNumber,
	type CdaValidationResult,
} from "@dental/shared/cda";
import { validateRussianInn, validateRussianOgrn } from "@dental/shared";

export {
	validateFdiToothNumber as validateFdiTooth,
	validateRussianInn,
	validateRussianOgrn,
};

export function validateCdaParams(p: any): CdaValidationResult {
	if (!p || typeof p !== "object") return canonicalValidateCdaParams(p);
	const c = (p.patient && p.doctor) ? p : {
		docKind: "108",
		documentId: p.documentId || "00000000-0000-0000-0000-000000000000",
		visitDate: p.visitDate ? new Date(p.visitDate) : new Date(),
		patient: {
			patientId: p.patientId,
			name: p.patientName || { first: "", last: "" },
			snils: p.patientSnils,
			birthDate: typeof p.patientBirthDate === "string" ? p.patientBirthDate : (p.patientBirthDate ? new Date(p.patientBirthDate).toISOString().slice(0, 10) : "1980-01-01"),
			gender: p.patientGender,
		},
		doctor: {
			name: p.doctorName || { first: "", last: "" },
			snils: p.doctorSnils,
			position: p.doctorPosition,
			positionCode: p.doctorPositionCode,
		},
		clinic: {
			oid: p.clinicOid,
			name: p.clinicName || "",
			ogrn: p.clinicOgrn,
			inn: p.clinicInn,
		},
		diagnoses: p.icd10Code ? [{ icd10Code: p.icd10Code, diagnosisText: p.diagnosisText || "", tooth: p.diagnosisTooth }] : [],
		dentalStatus: p.dentalStatus || p.odontogram,
		services: p.services || p.servicesRendered,
	};
	return canonicalValidateCdaParams(c);
}
