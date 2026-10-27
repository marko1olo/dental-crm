import React, { useState } from "react";
import { ChevronDown, LayoutGrid, Stethoscope } from "lucide-react";
import { saveWorkspaceFlags, useWorkspaceProfileStore, type WorkspaceFeatureFlags } from "../../../hooks/useWorkspaceProfile";
import { useDoctorPreferencesStore, type DoctorSpecialtyKey } from "../../../store/doctorPreferencesStore";
import { CLINICAL_ROLE_PRESETS, type ClinicalRolePreset } from "../workspaceRolePresets";
import { FEATURE_TOGGLES } from "./featureToggleDefs";
import { FeatureToggleCard } from "./FeatureToggleCard";
import { ClinicalRoleSelectorBar } from "./ClinicalRoleSelectorBar";
import { ClinicalRoleSpotlightCard } from "./ClinicalRoleSpotlightCard";

export function WorkspaceFeaturesSelector() {
	const store = useWorkspaceProfileStore();
	const doctorSpecialty = useDoctorPreferencesStore((s) => s.preferences.specialty);
	const [selectedRoleKey, setSelectedRoleKey] = useState<DoctorSpecialtyKey>(() =>
		doctorSpecialty && CLINICAL_ROLE_PRESETS.some((p) => p.key === doctorSpecialty) ? doctorSpecialty : "therapist",
	);
	const [applyingPreset, setApplyingPreset] = useState<boolean>(false);
	const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
	const [saving, setSaving] = useState<string | null>(null);
	const [saved, setSaved] = useState<string | null>(null);
	const [failure, setFailure] = useState<{ key: string; text: string } | null>(null);

	const activePreset = CLINICAL_ROLE_PRESETS.find((p) => p.key === selectedRoleKey) ?? CLINICAL_ROLE_PRESETS[0]!;

	async function handleApplyRolePreset(preset: ClinicalRolePreset) {
		setApplyingPreset(true);
		setFailure(null);
		setPresetFeedback(null);
		try {
			useDoctorPreferencesStore.getState().applySpecialtyPreset(preset.key);
			const result = await saveWorkspaceFlags(preset.presetFlags);
			if (result.savedOnServer) {
				setPresetFeedback(`Профиль «${preset.shortTitle}» успешно активирован и сохранён в базе данных`);
				setTimeout(() => setPresetFeedback(null), 3500);
			} else {
				setFailure({ key: "role-preset", text: result.failureText ?? "Профиль применён локально, но не сохранён на сервере клиники." });
			}
		} catch (err: unknown) {
			setFailure({ key: "role-preset", text: err instanceof Error ? err.message : "Ошибка применения профиля" });
		} finally {
			setApplyingPreset(false);
		}
	}

	async function handleToggle(key: keyof WorkspaceFeatureFlags, value: boolean) {
		setSaving(key);
		setFailure((curr) => (curr && curr.key === key ? null : curr));
		try {
			const result = await saveWorkspaceFlags({ [key]: value });
			if (result.savedOnServer) {
				setSaved(key);
				setTimeout(() => setSaved(null), 1800);
			} else {
				setFailure({ key, text: result.failureText ?? "Набор модулей не сохранён на сервере. Повторите переключение." });
			}
		} finally {
			setSaving(null);
		}
	}

	const priorityToggles = FEATURE_TOGGLES.filter((def) =>
		(activePreset.priorityToggleKeys as readonly string[]).includes(def.key),
	);

	return (
		<div id="workspace-features-selector" className="flex flex-col gap-4">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
				<div>
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">Клиническая специализация и модули рабочего места</h3>
					<p className="m-0 text-xs text-slate-500 dark:text-slate-400">Быстрая адаптация интерфейса под врачебную роль без лишнего визуального шума</p>
				</div>
				<div className="text-xs text-slate-500 dark:text-slate-400">
					Активный профиль: <strong className="capitalize text-slate-800 dark:text-slate-200">{store.workspacePreset.replace(/_/g, " ")}</strong>
				</div>
			</div>

			<ClinicalRoleSelectorBar presets={CLINICAL_ROLE_PRESETS} selectedRoleKey={selectedRoleKey} currentDoctorSpecialty={doctorSpecialty} onSelectRole={setSelectedRoleKey} />

			<ClinicalRoleSpotlightCard activePreset={activePreset} currentDoctorSpecialty={doctorSpecialty} applyingPreset={applyingPreset} presetFeedback={presetFeedback} failureText={failure?.key === "role-preset" ? failure.text : null} onApplyPreset={handleApplyRolePreset} />

			<div className="flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 m-0">Приоритетные модули для роли «{activePreset.shortTitle}»</h4>
					<span className="text-[11px] text-slate-400">{priorityToggles.length} модуля</span>
				</div>
				<div className="flex flex-col gap-2.5">
					{priorityToggles.map((def) => (
						<FeatureToggleCard key={def.key} def={def} isOn={Boolean(store[def.key])} isSaving={saving === def.key} isSaved={saved === def.key} failureText={failure?.key === def.key ? failure.text : null} onToggle={(v) => handleToggle(def.key, v)} />
					))}
				</div>
			</div>

			<details data-testid="all-system-features-details" className="group border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden">
				<summary className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 select-none hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors min-h-[44px]">
					<div className="flex items-center gap-2">
						<LayoutGrid size={16} className="text-slate-400 group-open:text-teal-500 transition-colors" />
						<span>Все системные модули ({FEATURE_TOGGLES.length})</span>
					</div>
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<span className="hidden sm:inline">Полный каталог флагов</span>
						<ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" />
					</div>
				</summary>
				<div className="p-3.5 sm:p-4 pt-2 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800/60">
					{FEATURE_TOGGLES.map((def) => (
						<FeatureToggleCard key={def.key} def={def} isOn={Boolean(store[def.key])} isSaving={saving === def.key} isSaved={saved === def.key} failureText={failure?.key === def.key ? failure.text : null} onToggle={(v) => handleToggle(def.key, v)} />
					))}
				</div>
			</details>

			<div className="mt-1 p-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
				<Stethoscope size={14} className="text-teal-500 shrink-0" />
				<span>Изменения применяются мгновенно и сохраняются в базе данных клиники.</span>
			</div>
		</div>
	);
}
