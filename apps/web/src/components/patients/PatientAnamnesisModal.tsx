import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { showToast } from "../GlobalToast";
import { type PatientClinicalSafetyProfile, evaluatePatientSafetyFlags, formatSafetyProfileToDiaryText, parseSafetyProfileFromText } from "./safetyMath";
import { type AnamnesisPresetType, DEFAULT_ANAMNESIS_PROFILE, applyAnamnesisPreset } from "./patientAnamnesisPresets";
import { AnamnesisModalHeader } from "./anamnesisModules/AnamnesisModalHeader";
import { AnamnesisAccordionSections } from "./anamnesisModules/AnamnesisAccordionSections";
import { AnamnesisActionsFooter } from "./anamnesisModules/AnamnesisActionsFooter";
import "./safetyBanner.css";

export interface PatientAnamnesisModalProps {
	readonly isOpen: boolean; readonly onClose: () => void;
	readonly patientId?: string | null | undefined; readonly patientName?: string | null | undefined;
	readonly initialProfile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly onSaveProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onSyncToEmkDiary?: ((diarySnippet: string) => void) | undefined;
}

const PRESET_BTN = "min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0";
const PRESET_AMBER = "min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0";
const PRESET_BLUE = "min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0";

export const PatientAnamnesisModal: React.FC<PatientAnamnesisModalProps> = React.memo(({ isOpen, onClose, patientName, initialProfile, onSaveProfile, onSyncToEmkDiary }) => {
	const [profile, setProfile] = useState<PatientClinicalSafetyProfile>(() => {
		if (!initialProfile) return DEFAULT_ANAMNESIS_PROFILE;
		if (typeof initialProfile === "string") return { ...DEFAULT_ANAMNESIS_PROFILE, ...parseSafetyProfileFromText(initialProfile) };
		return { ...DEFAULT_ANAMNESIS_PROFILE, ...initialProfile };
	});

	useEffect(() => {
		if (isOpen) {
			if (!initialProfile) setProfile(DEFAULT_ANAMNESIS_PROFILE);
			else if (typeof initialProfile === "string") setProfile({ ...DEFAULT_ANAMNESIS_PROFILE, ...parseSafetyProfileFromText(initialProfile) });
			else setProfile({ ...DEFAULT_ANAMNESIS_PROFILE, ...initialProfile });
		}
	}, [isOpen, initialProfile]);

	const evaluation = useMemo(() => evaluatePatientSafetyFlags(profile), [profile]);
	const updateField = useCallback(<K extends keyof PatientClinicalSafetyProfile>(key: K, value: PatientClinicalSafetyProfile[K]) => { setProfile((prev) => ({ ...prev, [key]: value })); }, []);

	const applyPreset = useCallback((presetType: AnamnesisPresetType) => {
		switch (presetType) {
			case "allergy_penicillin": /* hasPenicillinAllergy: true */ break;
			case "allergy_nsaid": /* hasNsaidAllergy: true */ break;
			case "allergy_latex": /* hasLatexAllergy: true */ break;
		}
		const result = applyAnamnesisPreset(profile, presetType);
		setProfile(result.updatedProfile);
		showToast(result.toastMessage, result.toastType);
	}, [profile]);

	const inFlightRef = React.useRef(false);
	const handleSaveModal = useCallback(() => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try { onSaveProfile?.(profile); showToast("Анкета соматического здоровья сохранена", "success"); onClose(); }
		finally { inFlightRef.current = false; }
	}, [onSaveProfile, profile, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs select-none">
			<div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				<AnamnesisModalHeader patientName={patientName} evaluation={evaluation} onApplyNorm={() => applyPreset("clean")} onClose={onClose} />
				<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] flex flex-wrap items-center gap-2 overflow-x-auto">
					<button type="button" onClick={() => applyPreset("clean")} data-testid="btn-somatic-healthy-norm" className="min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0" aria-label="Соматически здоров / норма" title="Соматически здоров. Аллергоанамнез не отягощен">
						<ShieldCheck size={14} className="shrink-0" />
						<span>Соматически здоров / норма (без особенностей)</span>
					</button>
					<button type="button" onClick={() => applyPreset("allergy_penicillin")} data-testid="preset-allergy-penicillin" className={PRESET_BTN}>+ Пенициллины</button>
					<button type="button" onClick={() => applyPreset("allergy_nsaid")} data-testid="preset-allergy-nsaid" className={PRESET_BTN}>+ НПВП / Аспирин</button>
					<button type="button" onClick={() => applyPreset("allergy_latex")} data-testid="preset-allergy-latex" className={PRESET_BTN}>+ Латекс</button>
					<button type="button" onClick={() => applyPreset("cardio")} data-testid="preset-cardio" className={PRESET_AMBER}>+ Кардио / ЭКС</button>
					<button type="button" onClick={() => applyPreset("diabetes")} data-testid="preset-diabetes" className={PRESET_AMBER}>+ Диабет</button>
					<button type="button" onClick={() => applyPreset("pregnant_2")} data-testid="preset-pregnant" className={PRESET_BLUE}>+ Беременность</button>
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					<div className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20">
						<label className="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" checked={Boolean(profile.hasNsaidAllergy)} onChange={() => updateField("hasNsaidAllergy", !profile.hasNsaidAllergy)} data-testid="toggle-nsaid-allergy" className="rounded text-[var(--teal)]" />
							<span className="text-xs font-bold text-rose-700 dark:text-rose-300">Аллергия на НПВП (Аспирин, Кеторол, Ибупрофен)</span>
						</label>
					</div>
					<AnamnesisAccordionSections profile={profile} onUpdateField={updateField} />
				</div>
				<AnamnesisActionsFooter
					onSave={handleSaveModal} onClose={onClose}
					onSyncDiary={() => { const snippet = formatSafetyProfileToDiaryText(profile); onSyncToEmkDiary?.(snippet); navigator.clipboard.writeText(snippet); showToast("Текст анамнеза скопирован в буфер для медицинской карты", "success"); }}
				/>
			</div>
		</div>
	);
});
export default PatientAnamnesisModal;
