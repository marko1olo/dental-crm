/**
 * usePrescriptionClinicalWarnings.ts — Allergy & Somatic Warnings Checker Hook
 * Decomposed hook <= 120 lines (Mandate 8b).
 */

import { useMemo } from "react";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";
import {
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
} from "./prescriptionAllergyChecker";

export interface PrescriptionClinicalWarningsParams {
	readonly patient?:
		| {
				readonly allergies?:
					| readonly string[]
					| string[]
					| string
					| null
					| undefined;
				readonly [key: string]: unknown;
		  }
		| null
		| undefined;
	readonly allergies?: readonly string[] | string[] | string | null | undefined;
	readonly diary?:
		| {
				readonly diagnosisIcd10?: string | null | undefined;
				readonly anamnesis?: string | null | undefined;
				readonly [key: string]: unknown;
		  }
		| null
		| undefined;
	readonly activeItems: readonly PrescriptionDrugItem[];
}

export function usePrescriptionClinicalWarnings(
	p: PrescriptionClinicalWarningsParams,
) {
	const resolvedPatientAllergies = p.allergies ?? p.patient?.allergies ?? "";

	const allergyConflicts = useMemo(() => {
		return detectPrescriptionAllergyConflicts(
			resolvedPatientAllergies,
			p.activeItems,
		);
	}, [resolvedPatientAllergies, p.activeItems]);

	const somaticWarnings = useMemo(() => {
		const anamnesis = [
			resolvedPatientAllergies,
			typeof p.diary?.anamnesis === "string" ? p.diary.anamnesis : "",
			p.patient && typeof p.patient.somaticAnamnesis === "string"
				? p.patient.somaticAnamnesis
				: "",
			p.patient && typeof p.patient.chronicDiseases === "string"
				? p.patient.chronicDiseases
				: "",
		]
			.filter(Boolean)
			.join(" ");

		return detectPrescriptionSomaticWarnings(anamnesis, p.activeItems);
	}, [resolvedPatientAllergies, p.diary, p.patient, p.activeItems]);

	return {
		resolvedPatientAllergies,
		allergyConflicts,
		somaticWarnings,
	};
}
