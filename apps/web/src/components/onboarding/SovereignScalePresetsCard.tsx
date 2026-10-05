/**
 * apps/web/src/components/onboarding/SovereignScalePresetsCard.tsx
 *
 * 3-Click Sovereign Scale Presets (Частный кабинет, Стандартная клиника, Сеть).
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (Zero barriers to solo doctors on chair rental).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis, strictly Lucide SVG icons).
 * - Mandate 8n: Solo Doctor & Scale Sovereignty (Instant setup without dead ends).
 * - Mandate 8b: Strictly <= 800 lines.
 */

import React, { useState } from "react";
import {
	Building2,
	Check,
	CheckCircle2,
	Clock,
	Layers,
	Network,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Users,
	Zap,
} from "lucide-react";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useWorkspaceProfileStore, saveWorkspaceFlags } from "../../hooks/useWorkspaceProfile";
import { useDeepClinicalSettingsStore } from "../../store/deepClinicalSettingsStore";
import { showToast } from "../GlobalToast";

export type SovereignPresetId = "solo_doctor" | "standard_clinic" | "network_center";

export interface SovereignPresetDefinition {
	id: SovereignPresetId;
	title: string;
	subtitle: string;
	badge: string;
	badgeClass: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	chairsCountText: string;
	recommendationText: string;
	features: string[];
	excludedFeatures?: string[];
}

export const SOVEREIGN_PRESETS: readonly SovereignPresetDefinition[] = [
	{
		id: "solo_doctor",
		title: "Частный кабинет / Соло-врач",
		subtitle: "1 кресло • 0 бюрократии",
		badge: "Быстрый старт (30 сек)",
		badgeClass: "badge-solo",
		icon: Stethoscope,
		chairsCountText: "1 кресло (Терапия/Хирургия)",
		recommendationText: "Врач на субаренде, частный кабинет, приём без ассистента и ресепшена",
		features: [
			"Приём и зубная формула FDI 11..48",
			"Автозаполнение протокола «✓ Соматически здоров» в 1 тап",
			"Экспресс-касса (Наличные + СБП по QR без ИНН физлиц)",
			"Минималистичный склад без блокировок приёма",
			"Скрыт сетевой административный шум",
		],
		excludedFeatures: [
			"Без жесткого партионного учета МДЛП",
			"Без согласований начмедов",
			"Без очередей колл-центра",
		],
	},
	{
		id: "standard_clinic",
		title: "Стандартная клиника",
		subtitle: "2–5 кресел • Команда врачей",
		badge: "Оптимум для клиники",
		badgeClass: "badge-standard",
		icon: Building2,
		chairsCountText: "3 кресла (Терапия, Хирургия, Ортопедия)",
		recommendationText: "Семейная стоматология, разделение ролей: администратор, врачи и ассистенты",
		features: [
			"Расписание по креслам и докторам с гибким шагом",
			"Раздельные права доступа (Администратор / Врач / Ассистент)",
			"Кассовый блок 54-ФЗ с фискализацией и терминалом эквайринга",
			"Электронные журналы SanPiN 3.3686-21 (Автоклав, тест 5 класса)",
			"Интеграция со снимками визиографа и 2D-рентгена",
		],
		excludedFeatures: [
			"Без сложной многофилиальной маршрутизации",
		],
	},
	{
		id: "network_center",
		title: "Многопрофильный центр / Сеть",
		subtitle: "Филиалы • ЗТЛ • КТ 3D",
		badge: "Максимальный масштаб",
		badgeClass: "badge-network",
		icon: Network,
		chairsCountText: "5+ кресел (Все специализации + Детство)",
		recommendationText: "Крупные медицинские центры, сеть филиалов, собственная зуботехническая лаборатория",
		features: [
			"Филиальная изоляция и единый контакт-центр",
			"Склад FEFO по номенклатуре Минздрава 804н",
			"Зуботехническая лаборатория (ЗТЛ: канбан нарядов и расцветка VITA)",
			"Интеграция с 3D КТ / КЛКТ томографом и PACS",
			"ЕГИСЗ РЭМД и страховые компании (ДМС)",
		],
	},
];

export interface SovereignScalePresetsCardProps {
	onPresetApplied?: (presetId: SovereignPresetId) => void;
	compactMode?: boolean;
}

export function SovereignScalePresetsCard({
	onPresetApplied,
	compactMode = false,
}: SovereignScalePresetsCardProps) {
	const { profile, setOperationalMode, updateProfile, chairs, schedule, updateSchedule } =
		useOnboardingStore();
	const [activeApplyingId, setActiveApplyingId] = useState<SovereignPresetId | null>(null);

	const activePresetId: SovereignPresetId =
		profile.mode === "solo_doctor" || profile.mode === "one_chair"
			? "solo_doctor"
			: profile.mode === "small_clinic"
				? "standard_clinic"
				: "network_center";

	const handleApplyPreset = async (presetId: SovereignPresetId) => {
		setActiveApplyingId(presetId);
		try {
			if (presetId === "solo_doctor") {
				// 1. Setup store mode and defaults
				setOperationalMode("solo_doctor");
				const fallback = profile.clinicName?.trim() || "Кабинет доктора";
				updateProfile({
					clinicName: fallback,
					mode: "solo_doctor",
				});
				updateSchedule({
					workdayStart: "09:00",
					workdayEnd: "18:00",
					defaultVisitMinutes: 30,
				});

				// 2. Feature flags for Solo Doctor (Zero bureaucracy, Mandate 8n)
				await saveWorkspaceFlags({
					hasAssistants: false,
					hasMultipleChairs: false,
					hasDentalLab: false,
					hasInsuranceCoPay: false,
					hasPayrollModule: false,
					hasMarketingModule: false,
					hasAnalyticsModule: false,
					hasInventoryModule: false,
					hasOrthodontics: false,
					hasGnathology: false,
					hasTasks: false,
					hasCsoScanner: false,
					hasLeadsKanban: false,
					hasOmnichannel: false,
					hasClinicalRules: false,
					hasEngineeringStatus: false,
					numberOfDoctors: 1,
					workspacePreset: "solo_therapist",
				});

				// 3. Deep clinical preset
				useDeepClinicalSettingsStore.getState().applyPreset("solo");

				showToast("Пресет «Соло-врач / Частный кабинет» успешно применён! Сетевой шум скрыт.", "success");
			} else if (presetId === "standard_clinic") {
				// 1. Standard clinic
				setOperationalMode("small_clinic");
				const fallback = profile.clinicName?.trim() || "Стоматологическая клиника";
				updateProfile({
					clinicName: fallback,
					mode: "small_clinic",
				});
				updateSchedule({
					workdayStart: "09:00",
					workdayEnd: "20:00",
					defaultVisitMinutes: 45,
				});

				// 2. Feature flags for Standard Clinic
				await saveWorkspaceFlags({
					hasAssistants: true,
					hasMultipleChairs: true,
					hasDentalLab: true,
					hasInsuranceCoPay: true,
					hasInstallments: true,
					hasOrthodontics: true,
					hasTasks: true,
					hasReclamations: true,
					hasPediatricMode: true,
					hasPayrollModule: true,
					hasMarketingModule: true,
					hasAnalyticsModule: true,
					hasInventoryModule: true,
					hasOmnichannel: true,
					hasClinicalRules: true,
					numberOfDoctors: 4,
					workspacePreset: "family_clinic",
				});

				// 3. Deep clinical preset
				useDeepClinicalSettingsStore.getState().applyPreset("standard");

				showToast("Пресет «Стандартная клиника (2–5 кресел)» успешно применён!", "success");
			} else {
				// 1. Network / Center
				setOperationalMode("network_clinic");
				const fallback = profile.clinicName?.trim() || "Стоматологический центр";
				updateProfile({
					clinicName: fallback,
					mode: "network_clinic",
				});
				updateSchedule({
					workdayStart: "08:00",
					workdayEnd: "21:00",
					defaultVisitMinutes: 60,
				});

				// 2. Feature flags for Network
				await saveWorkspaceFlags({
					hasAssistants: true,
					hasMultipleChairs: true,
					hasDentalLab: true,
					hasInsuranceCoPay: true,
					hasInstallments: true,
					hasOrthodontics: true,
					hasGnathology: true,
					hasTasks: true,
					hasReclamations: true,
					hasPediatricMode: true,
					hasPayrollModule: true,
					hasMarketingModule: true,
					hasAnalyticsModule: true,
					hasInventoryModule: true,
					hasCsoScanner: true,
					hasLeadsKanban: true,
					hasOmnichannel: true,
					hasClinicalRules: true,
					hasEngineeringStatus: true,
					numberOfDoctors: 10,
					workspacePreset: "enterprise",
				});

				// 3. Deep clinical preset
				useDeepClinicalSettingsStore.getState().applyPreset("network");

				showToast("Пресет «Многопрофильный центр / Сеть» успешно применён!", "success");
			}

			onPresetApplied?.(presetId);
		} catch (err) {
			showToast("Пресет сохранён в локальном профиле", "info");
			onPresetApplied?.(presetId);
		} finally {
			setActiveApplyingId(null);
		}
	};

	return (
		<div className="sovereign-presets-wrapper my-3" data-testid="sovereign-presets-card">
			<div className="flex items-center justify-between gap-3 mb-3">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
						<Sparkles size={16} aria-hidden="true" />
					</div>
					<div>
						<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							Экспресс-старт в 3 клика
							<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
								Готовые пресеты
							</span>
						</h4>
						<p className="m-0 text-xs text-[var(--muted)]">
							Один клик преднастраивает кресла, расписание, кассу и протоколы ЭМК под масштаб вашей клиники
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				{SOVEREIGN_PRESETS.map((preset) => {
					const Icon = preset.icon;
					const isSelected = activePresetId === preset.id;
					const isApplying = activeApplyingId === preset.id;

					return (
						<button
							key={preset.id}
							type="button"
							className={`w-full sovereign-preset-box text-left p-4 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer ${
								isSelected
									? "border-teal-500 bg-teal-500/10 dark:bg-teal-500/15 shadow-sm ring-2 ring-teal-500/40"
									: "border-slate-200 dark:border-slate-800 bg-[var(--paper)] hover:border-teal-500/50 hover:bg-[var(--line)]/30 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
							}`}
							onClick={() => void handleApplyPreset(preset.id)}
							disabled={isApplying}
							data-testid={`preset-card-${preset.id}`}
						>
							<div className="w-full">
								<div className="flex items-start justify-between gap-2 mb-2">
									<div className="flex items-center gap-2.5">
										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
												isSelected
													? "bg-teal-600 text-white shadow-sm"
													: "bg-[var(--line)] text-[var(--ink)]"
											}`}
										>
											<Icon size={18} aria-hidden="true" />
										</div>
										<div>
											<strong className="block text-xs font-bold text-[var(--ink)]">
												{preset.title}
											</strong>
											<span className="block text-[11px] text-[var(--muted)]">
												{preset.subtitle}
											</span>
										</div>
									</div>

									{isSelected && (
										<div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
											<Check size={12} aria-hidden="true" />
										</div>
									)}
								</div>

								<div className="mb-2.5">
									<span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--line)] text-[var(--ink)]">
										{preset.chairsCountText}
									</span>
								</div>

								{!compactMode && (
									<ul className="text-[11px] text-[var(--muted)] space-y-1.5 mb-2 pl-0 list-none">
										{preset.features.slice(0, 3).map((f, i) => (
											<li key={i} className="flex items-center gap-1.5 line-clamp-1">
												<CheckCircle2 size={12} className="text-teal-600 shrink-0" aria-hidden="true" />
												<span className="truncate">{f}</span>
											</li>
										))}
									</ul>
								)}
							</div>

							<div className="w-full pt-3 mt-2 border-t border-[var(--line,rgba(148,163,184,0.2))] flex items-center justify-between text-[11px]">
								<span className="text-[var(--muted)] font-medium">
									{isSelected ? "Активный пресет" : "Выбрать в 1 клик"}
								</span>
								<span className="font-bold text-teal-600 dark:text-teal-400">
									{isSelected ? "Выбрано" : "Применить"}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
