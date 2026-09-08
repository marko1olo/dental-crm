import React from "react";
import {
	PatientAnamnesisModal,
	type PatientAnamnesisModalProps,
} from "./PatientAnamnesisModal";
import type { PatientClinicalSafetyProfile } from "./safetyMath";

/**
 * Канонический профиль физиологической нормы соматического здоровья (Мандат 8e п. 3, Мандат 8k, Мандат 8n).
 * Аллергий нет, соматических противопоказаний нет, гемостаз в норме.
 */
export const DEFAULT_SOMATIC_HEALTHY_NORM: PatientClinicalSafetyProfile = {
	hasLidocaineAllergy: false,
	hasArticaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasSulfiteAllergy: false,
	hasAnaphylaxisHistory: false,
	hasPacemakerExs: false,
	hasCardiovascularDisease: false,
	hasHypertension: false,
	takesAnticoagulants: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
	bisphosphonateName: "",
	pregnancyTrimester: "none",
	hasDiabetesMellitus: false,
	diabetesType: "unknown",
	hasBronchialAsthma: false,
	hasEpilepsy: false,
	hasHepatitis: false,
	hasHiv: false,
	hasThyroidDisease: false,
	hasPenicillinAllergy: false,
	hasLatexAllergy: false,
	customAllergyNotes: "",
	customChronicNotes: "Соматически здоров. Аллергический статус не отягощен. Физиологическая норма (без особенностей).",
	currentMedicationsList: "",
};

/**
 * Создание чистого профиля физиологической нормы в 1 клик.
 */
export function createHealthySomaticNormProfile(): PatientClinicalSafetyProfile {
	return { ...DEFAULT_SOMATIC_HEALTHY_NORM };
}

/**
 * Проверка, является ли профиль пациента физиологической нормой (без отягощений).
 */
export function isSomaticProfilePhysiologicalNorm(
	profile?: Partial<PatientClinicalSafetyProfile> | null,
): boolean {
	if (!profile) return true;
	return (
		!profile.hasLidocaineAllergy &&
		!profile.hasArticaineAllergy &&
		!profile.hasMepivacaineAllergy &&
		!profile.hasSulfiteAllergy &&
		!profile.hasAnaphylaxisHistory &&
		!profile.hasPacemakerExs &&
		!profile.hasCardiovascularDisease &&
		!profile.hasHypertension &&
		!profile.takesAnticoagulants &&
		!profile.takesBisphosphonates &&
		(profile.pregnancyTrimester === "none" || !profile.pregnancyTrimester) &&
		!profile.hasDiabetesMellitus &&
		!profile.hasBronchialAsthma &&
		!profile.hasEpilepsy &&
		!profile.hasHepatitis &&
		!profile.hasHiv &&
		!profile.hasThyroidDisease &&
		!profile.hasPenicillinAllergy &&
		!profile.hasLatexAllergy
	);
}

export interface PatientDetailModalProps extends PatientAnamnesisModalProps {
	readonly patientPhone?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly gender?: string | null | undefined;
	readonly email?: string | null | undefined;
	readonly onApplySomaticNorm?: ((normProfile: PatientClinicalSafetyProfile) => void) | undefined;
}

/**
 * PatientDetailModal — детальное модальное окно пациента и клинической анкеты соматического здоровья.
 *
 * МАНДАТЫ 8e, 8k, 8n:
 * Соматический анамнез имеет 1-клик кнопку «Соматически здоров / норма» (data-testid="btn-somatic-healthy-norm"),
 * исключая необходимость ручного прокликивания 50 больничных пунктов соматики.
 */
export const PatientDetailModal: React.FC<PatientDetailModalProps> = React.memo((props) => {
	const { onApplySomaticNorm, onSaveProfile, ...rest } = props;

	const handleSave = React.useCallback(
		(profile: PatientClinicalSafetyProfile) => {
			if (isSomaticProfilePhysiologicalNorm(profile) && onApplySomaticNorm) {
				onApplySomaticNorm(profile);
			}
			if (onSaveProfile) {
				onSaveProfile(profile);
			}
		},
		[onApplySomaticNorm, onSaveProfile],
	);

	return <PatientAnamnesisModal {...rest} onSaveProfile={handleSave} />;
});

PatientDetailModal.displayName = "PatientDetailModal";

export default PatientDetailModal;
export { PatientAnamnesisModal };
export type { PatientClinicalSafetyProfile };
