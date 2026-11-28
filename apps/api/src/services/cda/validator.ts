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
import { formatDateKeyInTimeZone, validateRussianInn, validateRussianOgrn } from "@dental/shared";

export {
	validateFdiToothNumber as validateFdiTooth,
	validateRussianInn,
	validateRussianOgrn,
};

export interface FlatCdaPersonName {
	first?: string | undefined;
	last?: string | undefined;
	middle?: string | undefined;
}

export interface LegacyFlatCdaParams {
	docKind?: string | undefined;
	documentId?: string | undefined;
	visitDate?: string | Date | undefined;
	patientId?: string | undefined;
	patientName?: FlatCdaPersonName | undefined;
	patientSnils?: string | undefined;
	patientBirthDate?: string | Date | undefined;
	patientGender?: "1" | "2" | undefined;
	doctorName?: FlatCdaPersonName | undefined;
	doctorSnils?: string | undefined;
	doctorPosition?: string | undefined;
	doctorPositionCode?: string | undefined;
	clinicOid?: string | undefined;
	clinicName?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicInn?: string | undefined;
	icd10Code?: string | undefined;
	diagnosisText?: string | undefined;
	diagnosisTooth?: number | undefined;
	dentalStatus?: unknown;
	odontogram?: unknown;
	services?: unknown;
	servicesRendered?: unknown;
	patient?: unknown;
	doctor?: unknown;
	clinic?: unknown;
	diagnoses?: unknown;
}

export type CdaValidationInput = LegacyFlatCdaParams | Record<string, unknown> | unknown;

export function validateCdaParams(p: CdaValidationInput): CdaValidationResult {
	if (!p || typeof p !== "object") return canonicalValidateCdaParams(p);
	const obj = p as Record<string, unknown>;
	if (obj["patient"] && obj["doctor"]) {
		return canonicalValidateCdaParams(obj);
	}
	const flat = obj as LegacyFlatCdaParams;
	const c = {
		docKind: flat.docKind || "108",
		documentId: flat.documentId || "00000000-0000-0000-0000-000000000000",
		visitDate: flat.visitDate ? new Date(flat.visitDate) : new Date(),
		patient: {
			patientId: flat.patientId,
			name: flat.patientName || { first: "", last: "" },
			snils: flat.patientSnils,
			birthDate:
				typeof flat.patientBirthDate === "string"
					? flat.patientBirthDate
					: flat.patientBirthDate
						? formatDateKeyInTimeZone(flat.patientBirthDate, "Europe/Samara")
						: "1980-01-01",
			gender: flat.patientGender,
		},
		doctor: {
			name: flat.doctorName || { first: "", last: "" },
			snils: flat.doctorSnils,
			position: flat.doctorPosition,
			positionCode: flat.doctorPositionCode,
		},
		clinic: {
			oid: flat.clinicOid,
			name: flat.clinicName || "",
			ogrn: flat.clinicOgrn,
			inn: flat.clinicInn,
		},
		diagnoses: flat.icd10Code ? [{ icd10Code: flat.icd10Code, diagnosisText: flat.diagnosisText || "", tooth: flat.diagnosisTooth }] : [],
		dentalStatus: flat.dentalStatus || flat.odontogram,
		services: flat.services || flat.servicesRendered,
	};
	return canonicalValidateCdaParams(c);
}
