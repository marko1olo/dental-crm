/**
 * apps/web/src/components/onboarding/SovereignScalePresetsCard.tsx
 *
 * 3-Click Sovereign Scale Presets (Частный кабинет, Стандартная клиника, Сеть).
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (Zero barriers to solo doctors on chair rental).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis, strictly Lucide SVG icons).
 * - Mandate 8n: Solo Doctor & Scale Sovereignty (Instant setup without dead ends).
 * - Anti-Monolith Invariant: Strictly <= 250 lines.
 */

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useAppStore } from "../../store/appStore";
import { useSettingsStore } from "../../store/settingsStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { clinicProfileDraftFromProfile } from "../../utils/clinicProfileUtils";
import { showToast } from "../GlobalToast";
import {
	SOVEREIGN_PRESETS,
	type SovereignPresetDefinition,
	type SovereignPresetId,
} from "./scalePresetsModules/scalePresetsTypesAndConstants";
import { SovereignPresetCardItem } from "./scalePresetsModules/SovereignPresetCardItem";
import { SovereignPresetConfirmModal } from "./scalePresetsModules/SovereignPresetConfirmModal";
import { applyScalePresetStores } from "./scalePresetsModules/scalePresetsStoreApplier";

export type { SovereignPresetDefinition, SovereignPresetId };
export { SOVEREIGN_PRESETS };

export interface SovereignScalePresetsCardProps {
	onPresetApplied?: (presetId: SovereignPresetId) => void;
	compactMode?: boolean;
	hideHeader?: boolean;
	mode?: string | null;
}

export function SovereignScalePresetsCard({
	onPresetApplied,
	compactMode = false,
	hideHeader = false,
}: SovereignScalePresetsCardProps) {
	const { profile, setOperationalMode, updateProfile, updateSchedule } =
		useOnboardingStore();
	const [activeApplyingId, setActiveApplyingId] = useState<SovereignPresetId | null>(null);
	const [confirmingPreset, setConfirmingPreset] = useState<SovereignPresetDefinition | null>(null);

	const storedClinicMode =
		useSettingsStore((s) => s.clinicMode) ??
		useSettingsStore.getState().clinicMode;
	const dashboardClinicMode = useAppStore(
		(s) => s.dashboard?.clinicSettings?.profile?.mode,
	);

	const effectiveMode =
		storedClinicMode ?? dashboardClinicMode ?? profile.mode ?? "small_clinic";

	const activePresetId: SovereignPresetId =
		effectiveMode === "solo_doctor" || effectiveMode === "one_chair"
			? "solo_doctor"
			: effectiveMode === "network_clinic"
				? "network_center"
				: "standard_clinic";

	const executeApplyPreset = async (presetId: SovereignPresetId) => {
		setActiveApplyingId(presetId);
		try {
			// 1. Сетевой вызов PATCH /api/settings/clinic/scale-preset (персистентное сохранение в PostgreSQL 18)
			try {
				const response = await fetch("/api/settings/clinic/scale-preset", {
					method: "PATCH",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						preset: presetId,
						confirmResetExtraChairs: true,
					}),
				});
				if (response.ok) {
					const updatedSettings = await response.json();
					if (
						updatedSettings &&
						typeof updatedSettings === "object" &&
						"profile" in updatedSettings
					) {
						const appStore = useAppStore.getState();
						if (appStore.dashboard) {
							appStore.setDashboard({
								...appStore.dashboard,
								clinicSettings: updatedSettings,
							});
						}
						if (
							typeof appStore.setClinicProfileDraft === "function" &&
							updatedSettings.profile
						) {
							appStore.setClinicProfileDraft(
								clinicProfileDraftFromProfile(updatedSettings.profile),
							);
						}
					}
				} else {
					console.warn(
						`[ScalePreset] Server returned status ${response.status}. Falling back to client-side sync.`,
					);
				}
			} catch (netErr) {
				console.warn(
					"[ScalePreset] Network request failed. Updating local operational stores.",
					netErr,
				);
			}

			// 2. Адаптация клиентских сторов в соответствии с выбранным масштабом
			await applyScalePresetStores(presetId, {
				clinicName: profile.clinicName,
				setOperationalMode,
				updateProfile,
				updateSchedule,
			});

			onPresetApplied?.(presetId);
		} catch (err) {
			console.error("[ScalePreset] Error applying preset:", err);
			showToast("Пресет сохранён в локальном профиле", "info");
			onPresetApplied?.(presetId);
		} finally {
			setActiveApplyingId(null);
			setConfirmingPreset(null);
		}
	};

	const handleCardClick = (preset: SovereignPresetDefinition) => {
		if (preset.id === activePresetId) {
			showToast(`Пресет «${preset.title}» уже активен в вашей клинике`, "info");
			return;
		}
		// 1-Click мгновенное применение масштаба (Мандаты 8e, 8n)
		void executeApplyPreset(preset.id);
	};

	return (
		<div className="sovereign-presets-wrapper my-3" data-testid="sovereign-presets-card">
			{!hideHeader && (
				<div className="flex items-center justify-between gap-3 mb-3">
					<div className="flex items-center gap-2 min-w-0">
						<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<Sparkles size={16} aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex flex-wrap items-center gap-2">
								<span>Быстрый старт профиля клиники</span>
								<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 whitespace-nowrap shrink-0">
									Готовые пресеты
								</span>
							</h4>
							<p className="m-0 text-xs text-[var(--muted)]">
								Автоматическая настройка кресел, расписания, кассы и протоколов под масштаб клиники
							</p>
						</div>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				{SOVEREIGN_PRESETS.map((preset) => (
					<SovereignPresetCardItem
						key={preset.id}
						preset={preset}
						isSelected={activePresetId === preset.id}
						isApplying={activeApplyingId === preset.id}
						compactMode={compactMode}
						onSelect={handleCardClick}
					/>
				))}
			</div>

			<SovereignPresetConfirmModal
				confirmingPreset={confirmingPreset}
				isApplying={activeApplyingId !== null}
				onClose={() => setConfirmingPreset(null)}
				onConfirm={(preset) => void executeApplyPreset(preset.id)}
			/>
		</div>
	);
}
