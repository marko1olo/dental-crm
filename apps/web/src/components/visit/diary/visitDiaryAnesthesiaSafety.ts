import type { DiaryState } from "../../useVisitDiaryLogic";

export interface PatientAnesthesiaSafetyFlags {
	hasLidocaineAllergy: boolean;
	hasArticaineAllergy: boolean;
	hasCardiovascularRisk: boolean;
	hasSulfiteAllergy: boolean;
	hasBronchialAsthma: boolean;
	isPregnantOrLactating: boolean;
	patientWeightKg: number;
}

export function extractPatientAnesthesiaProfile(
	activePatient: unknown,
	diary: DiaryState,
): PatientAnesthesiaSafetyFlags {
	const p = (
		activePatient && typeof activePatient === "object" ? activePatient : {}
	) as Record<string, unknown>;
	const clinical = (p.clinicalSafetyProfile || {}) as Record<string, unknown>;
	const admin = (p.administrativeProfile || {}) as Record<string, unknown>;
	const adminClinical = (admin.clinicalSafetyProfile || {}) as Record<
		string,
		unknown
	>;

	const checkText = (needle: string): boolean => {
		const n = needle.toLowerCase();
		if (
			typeof p.allergies === "string" &&
			p.allergies.toLowerCase().includes(n)
		)
			return true;
		if (
			Array.isArray(p.allergies) &&
			p.allergies.some((a: unknown) => String(a).toLowerCase().includes(n))
		)
			return true;
		if (typeof p.notes === "string" && p.notes.toLowerCase().includes(n))
			return true;
		if (
			typeof p.anamnesis === "string" &&
			p.anamnesis.toLowerCase().includes(n)
		)
			return true;
		return Boolean(diary.comorbidities?.toLowerCase().includes(n));
	};

	const hasLidocaineAllergy = Boolean(
		clinical.hasLidocaineAllergy ||
			admin.hasLidocaineAllergy ||
			adminClinical.hasLidocaineAllergy ||
			checkText("лидокаин"),
	);
	const hasArticaineAllergy = Boolean(
		clinical.hasArticaineAllergy ||
			admin.hasArticaineAllergy ||
			adminClinical.hasArticaineAllergy ||
			checkText("артикаин"),
	);
	const hasCardiovascularRisk = Boolean(
		clinical.hasCardiovascularDisease ||
			clinical.hasPacemakerExs ||
			clinical.hasHypertension ||
			checkText("сердц") ||
			checkText("давлен") ||
			checkText("ибс") ||
			checkText("гипертон"),
	);
	const hasSulfiteAllergy = Boolean(
		clinical.hasSulfiteAllergy || checkText("сульфит") || checkText("аллерги"),
	);
	const hasBronchialAsthma = Boolean(
		clinical.hasBronchialAsthma || checkText("астм") || checkText("бронх"),
	);
	const isPregnantOrLactating = Boolean(
		(clinical.pregnancyTrimester && clinical.pregnancyTrimester !== "none") ||
			checkText("беремен") ||
			checkText("лактац"),
	);

	const weight =
		typeof p.weightKg === "number" && p.weightKg > 0
			? p.weightKg
			: typeof admin.weightKg === "number" && admin.weightKg > 0
				? (admin.weightKg as number)
				: 70;

	return {
		hasLidocaineAllergy,
		hasArticaineAllergy,
		hasCardiovascularRisk,
		hasSulfiteAllergy,
		hasBronchialAsthma,
		isPregnantOrLactating,
		patientWeightKg: weight,
	};
}

export function getPassiveAnesthesiaAlert(
	flags: PatientAnesthesiaSafetyFlags,
): string | null {
	const alerts: string[] = [];
	if (flags.hasSulfiteAllergy || flags.hasBronchialAsthma) {
		alerts.push(
			"Аллергия на сульфиты/бронхиальная астма (рекомендуется Скандонест 3% без вазоконстриктора)",
		);
	}
	if (flags.hasArticaineAllergy) {
		alerts.push("Аллергия на артикаин");
	}
	if (flags.hasLidocaineAllergy) {
		alerts.push("Аллергия на лидокаин");
	}
	if (flags.hasCardiovascularRisk && !flags.hasSulfiteAllergy) {
		alerts.push(
			"Кардио-риск (щадящий режим: Скандонест 3% или адреналин <= 0.04 мг)",
		);
	}
	return alerts.length > 0 ? alerts.join(". ") : null;
}
