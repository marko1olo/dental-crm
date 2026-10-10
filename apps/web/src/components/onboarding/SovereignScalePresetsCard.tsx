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
import { useSettingsStore } from "../../store/settingsStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
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
		subtitle: "1 кресло • Индивидуальный приём",
		badge: "Быстрый старт (30 сек)",
		badgeClass: "badge-solo",
		icon: Stethoscope,
		chairsCountText: "1 кресло (Терапия/Хирургия)",
		recommendationText: "Врач на субаренде, частный кабинет, приём без ассистента и ресепшена",
		features: [
			"Приём и зубная формула FDI 11..48",
			"Автозаполнение протокола «✓ Соматически здоров»",
			"Экспресс-касса (Наличные + СБП по QR без ИНН физлиц)",
			"Минималистичный склад без блокировок приёма",
			"Скрыт сетевой административный шум",
		],
		excludedFeatures: [
			"Без жесткого партионного учета МДЛП",
			"Прямое ведение документации",
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
			"Зуботехническая лаборатория (ЗТЛ и наряды VITA)",
			"Интеграция с 3D КТ / КЛКТ томографом и PACS",
			"ЕГИСЗ РЭМД и страховые компании (ДМС)",
		],
	},
];

export interface SovereignScalePresetsCardProps {
	onPresetApplied?: (presetId: SovereignPresetId) => void;
	compactMode?: boolean;
	hideHeader?: boolean;
}

export function SovereignScalePresetsCard({
	onPresetApplied,
	compactMode = false,
	hideHeader = false,
}: SovereignScalePresetsCardProps) {
	const { profile, setOperationalMode, updateProfile, chairs, schedule, updateSchedule } =
		useOnboardingStore();
	const [activeApplyingId, setActiveApplyingId] = useState<SovereignPresetId | null>(null);
	const [confirmingPreset, setConfirmingPreset] = useState<SovereignPresetDefinition | null>(null);

	const storedClinicMode = useSettingsStore((s) => s.clinicMode);

	const activePresetId: SovereignPresetId =
		profile.mode === "solo_doctor" || profile.mode === "one_chair" || storedClinicMode === "solo_doctor" || storedClinicMode === "one_chair"
			? "solo_doctor"
			: profile.mode === "network_clinic" || storedClinicMode === "network_clinic"
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
				if (!response.ok) {
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
			if (presetId === "solo_doctor") {
				useSettingsStore.getState().setClinicMode("solo_doctor");
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

				useDeepClinicalSettingsStore.getState().applyPreset("solo");
				showToast("Пресет «Соло-врач / Частный кабинет» успешно применён! 1 кресло, сетевой шум скрыт.", "success");
			} else if (presetId === "standard_clinic") {
				useSettingsStore.getState().setClinicMode("small_clinic");
				setOperationalMode("small_clinic");
				const fallback = profile.clinicName?.trim() || "Стоматологическая клиника";
				updateProfile({
					clinicName: fallback,
					mode: "small_clinic",
				});
				updateSchedule({
					workdayStart: "08:30",
					workdayEnd: "20:30",
					defaultVisitMinutes: 45,
				});

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

				useDeepClinicalSettingsStore.getState().applyPreset("standard");
				showToast("Пресет «Стандартная клиника (2–5 кресел)» успешно применён! 3 кресла активированы.", "success");
			} else {
				useSettingsStore.getState().setClinicMode("network_clinic");
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

				useDeepClinicalSettingsStore.getState().applyPreset("network");
				showToast("Пресет «Многопрофильный центр / Сеть» успешно применён! 5 кресел и все модули активированы.", "success");
			}

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
		// Открываем диалог подтверждения перед применением пресета
		setConfirmingPreset(preset);
	};

	return (
		<div className="sovereign-presets-wrapper my-3" data-testid="sovereign-presets-card">
			{!hideHeader && (
				<div className="flex items-center justify-between gap-3 mb-3">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<Sparkles size={16} aria-hidden="true" />
						</div>
						<div>
							<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
								Быстрый старт профиля клиники
								<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
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
				{SOVEREIGN_PRESETS.map((preset) => {
					const Icon = preset.icon;
					const isSelected = activePresetId === preset.id;
					const isApplying = activeApplyingId === preset.id;

					return (
						<button
							key={preset.id}
							type="button"
							style={{ padding: "16px" }}
							className={`w-full sovereign-preset-box text-left rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer ${
								isSelected
									? "border-[var(--teal)] bg-[var(--paper-card)] shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
									: "border-[var(--line)] bg-[var(--paper-card)] hover:border-[var(--line-strong)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
							}`}
							onClick={() => handleCardClick(preset)}
							disabled={isApplying}
							data-testid={`preset-card-${preset.id}`}
						>
							<div className="w-full">
								<div className="flex items-start justify-between gap-2 mb-2.5">
									<div className="flex items-center gap-2.5">
										<div
											className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
												isSelected
													? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-2xs"
													: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
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
										<div className="w-5 h-5 rounded-full bg-[var(--teal)] text-[var(--on-teal)] flex items-center justify-center shrink-0">
											<Check size={12} aria-hidden="true" />
										</div>
									)}
								</div>

								<div className="mb-2.5">
									<span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
										{preset.chairsCountText}
									</span>
								</div>

								{!compactMode && (
									<ul className="text-[11px] text-[var(--muted)] space-y-1.5 mb-2 pl-0 list-none">
										{preset.features.slice(0, 3).map((f, i) => (
											<li key={i} className="flex items-start gap-1.5 leading-snug">
												<CheckCircle2 size={12} className="text-[var(--teal)] shrink-0 mt-0.5" aria-hidden="true" />
												<span>{f}</span>
											</li>
										))}
									</ul>
								)}
							</div>

							<div className="w-full pt-3 mt-2 border-t border-[var(--line)] flex items-center justify-between text-[11px]">
								<span className="text-[var(--muted)] font-medium">
									{isSelected ? "Активный пресет" : "Выбрать пресет"}
								</span>
								<span className="font-bold text-[var(--teal)]">
									{isSelected ? "Выбрано" : "Применить"}
								</span>
							</div>
						</button>
					);
				})}
			</div>

			{/* Диалог подтверждения смены масштаба клиники (Мандат 8e / 8n) */}
			{confirmingPreset && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
					data-testid="scale-preset-confirm-modal"
				>
					<div
						className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
						role="dialog"
						aria-modal="true"
						aria-labelledby="confirm-scale-preset-title"
					>
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
								<confirmingPreset.icon size={22} aria-hidden="true" />
							</div>
							<div className="flex-1">
								<h3
									id="confirm-scale-preset-title"
									className="m-0 text-base font-bold text-[var(--ink)] leading-snug"
								>
									Применить пресет «{confirmingPreset.title}»?
								</h3>
								<p className="m-0 mt-1 text-xs text-[var(--muted)]">
									{confirmingPreset.recommendationText}
								</p>
							</div>
						</div>

						<div className="p-3 rounded-xl bg-[var(--line)]/30 border border-[var(--line)] space-y-2">
							<div className="text-xs font-semibold text-[var(--ink)] flex items-center justify-between">
								<span>Оптимизация кресел:</span>
								<span className="text-teal-600 dark:text-teal-400 font-bold">
									{confirmingPreset.chairsCountText}
								</span>
							</div>
							<ul className="text-xs text-[var(--muted)] space-y-1.5 pl-0 list-none m-0">
								{confirmingPreset.features.slice(0, 3).map((f, i) => (
									<li key={i} className="flex items-center gap-2">
										<CheckCircle2 size={13} className="text-teal-600 shrink-0" aria-hidden="true" />
										<span>{f}</span>
									</li>
								))}
							</ul>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
							<button
								type="button"
								onClick={() => setConfirmingPreset(null)}
								disabled={activeApplyingId !== null}
								className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
								data-testid="cancel-preset-modal-btn"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={() => void executeApplyPreset(confirmingPreset.id)}
								disabled={activeApplyingId !== null}
								className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
								data-testid="confirm-preset-modal-btn"
							>
								{activeApplyingId === confirmingPreset.id ? (
									<>
										<Clock size={14} className="animate-spin" aria-hidden="true" />
										Применение...
									</>
								) : (
									<>
										<Check size={14} aria-hidden="true" />
										Применить пресет
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
