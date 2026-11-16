import { calculateAge } from "@dental/shared";
import { useMemo } from "react";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import {
	evaluatePatientSafetyFlags,
	isNegativeAllergyStatement,
} from "../patients/safetyMath";

export interface OdontogramPatientSafetyCandidate {
	readonly id?: string | undefined;
	readonly birthDate?: string | null | undefined;
	readonly allergies?: string | null | undefined;
	readonly anamnesis?: { readonly allergies?: string | null | undefined } | null | undefined;
	readonly clinicalSafetyProfile?: Parameters<typeof evaluatePatientSafetyFlags>[0] | null | undefined;
	readonly notes?: string | null | undefined;
}

export function useOdontogramModulePatientSafety(
	activePatient: OdontogramPatientSafetyCandidate | null | undefined,
	propDentitionMode?: "adult" | "pediatric" | "mixed" | undefined,
	pediatricMode?: boolean | undefined,
) {
	const perspective = usePerspectiveStore((state) => state.perspective);

	const allergyText = useMemo(() => {
		const pat = activePatient;
		if (!pat) return null;
		if (pat.allergies && !isNegativeAllergyStatement(String(pat.allergies)))
			return String(pat.allergies);
		if (
			pat.anamnesis?.allergies &&
			!isNegativeAllergyStatement(String(pat.anamnesis.allergies))
		)
			return String(pat.anamnesis.allergies);
		if (pat.clinicalSafetyProfile) {
			const flags = evaluatePatientSafetyFlags(pat.clinicalSafetyProfile);
			const allergyFlags = flags.activeFlags.filter(
				(f: { category: string }) =>
					f.category === "anesthesia_allergy" ||
					f.category === "general_allergy",
			);
			if (allergyFlags.length > 0) {
				return allergyFlags
					.map(
						(f: { shortBadge: string; titleRu: string }) =>
							f.shortBadge || f.titleRu,
					)
					.join(", ");
			}
			if (
				typeof pat.clinicalSafetyProfile === "object" &&
				pat.clinicalSafetyProfile !== null &&
				"customAllergyNotes" in pat.clinicalSafetyProfile &&
				pat.clinicalSafetyProfile.customAllergyNotes &&
				!isNegativeAllergyStatement(
					String(pat.clinicalSafetyProfile.customAllergyNotes),
				)
			) {
				return String(pat.clinicalSafetyProfile.customAllergyNotes);
			}
		}
		if (
			typeof pat.notes === "string" &&
			/аллерг|новокаин|лидокаин|артикаин/i.test(pat.notes) &&
			!isNegativeAllergyStatement(pat.notes)
		) {
			return pat.notes;
		}
		return null;
	}, [activePatient]);

	const patientAge = useMemo(() => {
		const bDate = activePatient?.birthDate;
		if (!bDate) return null;
		return calculateAge(bDate);
	}, [activePatient]);

	const initialSmartMode = useMemo<"adult" | "pediatric" | "mixed">(() => {
		if (propDentitionMode) return propDentitionMode;
		if (patientAge !== null) {
			if (patientAge < 6) return "pediatric";
			if (patientAge < 12) return "mixed";
			return "adult";
		}
		if (pediatricMode !== undefined)
			return pediatricMode ? "pediatric" : "adult";
		if (perspective === "pediatric") return "pediatric";
		return "adult";
	}, [propDentitionMode, pediatricMode, patientAge, perspective]);

	return { allergyText, initialSmartMode };
}
