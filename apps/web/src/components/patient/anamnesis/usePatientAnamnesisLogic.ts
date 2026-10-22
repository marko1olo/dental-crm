/**
 * usePatientAnamnesisLogic.ts — Хук состояния клинического анамнеза и 1-кликовой соматической нормы.
 * (Layer 3 Hook).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	createHealthySomaticNormProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	isSomaticProfilePhysiologicalNorm,
	parseSafetyProfileFromText,
	type PatientClinicalSafetyProfile,
} from "../../patients/safetyMath";

export interface UsePatientAnamnesisLogicParams {
	readonly initialProfile?:
		| Partial<PatientClinicalSafetyProfile>
		| string
		| null
		| undefined;
	readonly onSaveProfile?:
		| ((profile: PatientClinicalSafetyProfile) => void)
		| undefined;
	readonly onSyncToEmkDiary?: ((diarySnippet: string) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
}

export function usePatientAnamnesisLogic({
	initialProfile,
	onSaveProfile,
	onSyncToEmkDiary,
	onApplySomaticNorm,
}: UsePatientAnamnesisLogicParams) {
	const [profile, setProfile] = useState<PatientClinicalSafetyProfile>(() => {
		if (!initialProfile) return DEFAULT_SOMATIC_HEALTHY_NORM;
		if (typeof initialProfile === "string") {
			return {
				...DEFAULT_SOMATIC_HEALTHY_NORM,
				...parseSafetyProfileFromText(initialProfile),
			};
		}
		return { ...DEFAULT_SOMATIC_HEALTHY_NORM, ...initialProfile };
	});

	useEffect(() => {
		if (initialProfile) {
			if (typeof initialProfile === "string") {
				setProfile((prev) => ({
					...prev,
					...parseSafetyProfileFromText(initialProfile),
				}));
			} else {
				setProfile((prev) => ({ ...prev, ...initialProfile }));
			}
		}
	}, [initialProfile]);

	const evaluation = useMemo(
		() => evaluatePatientSafetyFlags(profile),
		[profile],
	);
	const isNorm = useMemo(
		() => isSomaticProfilePhysiologicalNorm(profile),
		[profile],
	);
	const diaryText = useMemo(
		() => formatSafetyProfileToDiaryText(profile),
		[profile],
	);

	const updateField = useCallback(
		<K extends keyof PatientClinicalSafetyProfile>(
			key: K,
			value: PatientClinicalSafetyProfile[K],
		) => {
			setProfile((prev) => ({
				...prev,
				[key]: value,
			}));
		},
		[],
	);

	const toggleField = useCallback(
		(key: keyof PatientClinicalSafetyProfile) => {
			setProfile((prev) => ({
				...prev,
				[key]: !prev[key],
			}));
		},
		[],
	);

	const handleApplyPhysiologicalNorm = useCallback(() => {
		const healthyNorm = createHealthySomaticNormProfile();
		setProfile(healthyNorm);
		onApplySomaticNorm?.();
		showToast(
			"✓ Физиологическая норма: соматически здоров, аллергий нет",
			"success",
			3500,
		);
	}, [onApplySomaticNorm]);

	const handleSave = useCallback(() => {
		onSaveProfile?.(profile);
		showToast("Соматический анамнез успешно сохранен", "success", 2500);
	}, [profile, onSaveProfile]);

	const handleSyncToEmk = useCallback(() => {
		if (onSyncToEmkDiary) {
			onSyncToEmkDiary(diaryText);
		} else {
			window.dispatchEvent(
				new CustomEvent("dente-sync-anamnesis-to-emk", {
					detail: { diarySnippet: diaryText, profile },
				}),
			);
		}
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(diaryText);
		}
		showToast("Анамнез скопирован и синхронизирован с ЭМК 043/у", "info", 3000);
	}, [diaryText, profile, onSyncToEmkDiary]);

	return {
		profile,
		setProfile,
		evaluation,
		isNorm,
		diaryText,
		updateField,
		toggleField,
		handleApplyPhysiologicalNorm,
		handleSave,
		handleSyncToEmk,
	};
}
