import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isSomaticProfilePhysiologicalNorm,
	parseSafetyProfileFromText,
} from "../../patients/safetyMath";
import type { SomaticAnamnesisCardProps } from "./types";

export function useSomaticCardState(props: SomaticAnamnesisCardProps) {
	const { initialProfile, onSave, onSyncToDiary, onApplyNorm } = props;

	const [profile, setProfile] = useState<PatientClinicalSafetyProfile>(() => {
		if (!initialProfile) return DEFAULT_SOMATIC_HEALTHY_NORM;
		if (typeof initialProfile === "string") {
			return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...parseSafetyProfileFromText(initialProfile) };
		}
		return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...initialProfile };
	});

	const evaluation = useMemo(() => evaluatePatientSafetyFlags(profile), [profile]);
	const isNorm = useMemo(() => isSomaticProfilePhysiologicalNorm(profile), [profile]);
	const diaryText = useMemo(() => formatSafetyProfileToDiaryText(profile), [profile]);

	const handleApplyPhysiologicalNorm = useCallback(() => {
		const normProfile = createHealthySomaticNormProfile();
		const updatedProfile: PatientClinicalSafetyProfile = {
			...normProfile,
			customChronicNotes:
				"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.",
		};
		setProfile(updatedProfile);
		if (onApplyNorm) onApplyNorm(updatedProfile);
		if (onSave) onSave(updatedProfile, formatSafetyProfileToDiaryText(updatedProfile));
		showToast("Применена физиологическая норма: соматически здоров", "success", 3000);
	}, [onApplyNorm, onSave]);

	const isMountedRef = useRef(false);
	useEffect(() => {
		if (!isMountedRef.current) {
			isMountedRef.current = true;
			return;
		}
		if (!onSave) return;
		const timer = setTimeout(() => {
			onSave(profile, diaryText);
		}, 800);
		return () => clearTimeout(timer);
	}, [profile, diaryText, onSave]);

	const toggleFlag = useCallback((key: keyof PatientClinicalSafetyProfile) => {
		setProfile((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const handleSave = useCallback(() => {
		if (onSave) onSave(profile, diaryText);
		showToast("Соматический статус пациента сохранен", "success", 2500);
	}, [profile, diaryText, onSave]);

	const handleSyncToDiary = useCallback(() => {
		if (onSyncToDiary) onSyncToDiary(diaryText);
		navigator.clipboard?.writeText?.(diaryText).catch(() => {});
		showToast("Запись перенесена в дневник приёма", "success", 3000);
	}, [diaryText, onSyncToDiary]);

	return {
		profile,
		setProfile,
		evaluation,
		isNorm,
		diaryText,
		toggleFlag,
		handleApplyPhysiologicalNorm,
		handleSave,
		handleSyncToDiary,
	};
}
