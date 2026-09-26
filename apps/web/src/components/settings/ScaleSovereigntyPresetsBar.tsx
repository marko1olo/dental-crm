/**
 * apps/web/src/components/settings/ScaleSovereigntyPresetsBar.tsx
 *
 * 1-Click Quick Launch Scale Presets («Начать за 3 минуты»).
 * Обеспечивает мгновенный старт и переключение масштаба:
 *  1. Одиночный врач (1 кресло / Субаренда) — ноль лишней бюрократии.
 *  2. Малая клиника (2–3 кресла, 1 администратор) — оптимум с кассой и складом.
 *  3. Сетевая клиника (Филиалы, колл-центр, КТ) — полный масштаб с протоколами.
 *
 * Mandate 8b: Строго <= 800 строк (текущий объем ~220 строк).
 * Mandate 8d: Ноль мультяшных эмодзи (строго Lucide иконки).
 * Mandate 8e / 8s: Scale Sovereignty (от одного кресла до сети клиник без тупиков).
 */

import {
	Building2,
	CheckCircle2,
	Flame,
	Layers,
	Loader2,
	Network,
	Sparkles,
	User,
} from "lucide-react";
import { useState } from "react";
import {
	applyWorkspacePreset,
	saveWorkspaceFlags,
	useWorkspaceProfileStore,
	type WorkspaceFeatureFlags,
} from "../../hooks/useWorkspaceProfile";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

export interface ScalePresetOption {
	id: "solo_therapist" | "family_clinic" | "enterprise";
	title: string;
	subtitle: string;
	badge: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	color: string;
	targetAudience: string;
	chairsCount: string;
	keyFeatures: string[];
	excludedFeatures?: string[];
	customFlags: Partial<WorkspaceFeatureFlags>;
}

export const SCALE_PRESETS: ScalePresetOption[] = [
	{
		id: "solo_therapist",
		title: "Одиночный врач",
		subtitle: "1 кресло / Субаренда кабинета",
		badge: "Быстрый старт (0 бюрократии)",
		icon: User,
		color: "hsl(210 85% 55%)",
		targetAudience: "Врач на аренде, частный кабинет, приём без ассистента",
		chairsCount: "1 кресло",
		keyFeatures: [
			"Приём пациентов и зубная формула",
			"Быстрый расчёт и планы лечения",
			"ЭМК 043/у и печать согласий",
			"Минималистичный календарь без деления по креслам",
		],
		excludedFeatures: [
			"Без склада и списаний МДЛП",
			"Без зарплатных ведомостей",
			"Без воронки маркетинга и лидов",
			"Без блокирующих регламентов",
		],
		customFlags: {
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
		},
	},
	{
		id: "family_clinic",
		title: "Малая клиника",
		subtitle: "2–3 установки + 1 администратор",
		badge: "Оптимум для клиники",
		icon: Building2,
		color: "hsl(155 75% 42%)",
		targetAudience: "Семейная стоматология, общий приём с ассистентом",
		chairsCount: "2–3 кресла",
		keyFeatures: [
			"Сетка расписания по креслам и врачам",
			"Касса 54-ФЗ и расчеты с пациентами",
			"Складской учет материалов и остатков",
			"Зарплаты и комиссии персонала",
			"WhatsApp и SMS напоминания о визитах",
		],
		excludedFeatures: [
			"Без сложных колл-центров",
			"Без многофилиальной маршрутизации",
		],
		customFlags: {
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
		},
	},
	{
		id: "enterprise",
		title: "Сетевая клиника",
		subtitle: "Филиалы, колл-центр, КТ / PACS",
		badge: "Максимальный масштаб",
		icon: Network,
		color: "hsl(265 80% 62%)",
		targetAudience: "Крупные медцентры, сеть отделений, холдинги",
		chairsCount: "4+ кресел, филиалы",
		keyFeatures: [
			"Многофилиальная структура и колл-центр",
			"Стерилизация ЦСО (штрихкоды лотков)",
			"Воронка лидов (Канбан CRM)",
			"Строгие клинические протоколы и аудит",
			"Лабораторные наряд-заказы и трекинг",
		],
		customFlags: {
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
		},
	},
];

export function ScaleSovereigntyPresetsBar() {
	const store = useWorkspaceProfileStore();
	const [applyingId, setApplyingId] = useState<string | null>(null);

	const activePresetId =
		store.workspacePreset === "solo"
			? "solo_therapist"
			: store.workspacePreset === "clinic"
				? "family_clinic"
				: store.workspacePreset;

	const handleApplyPreset = async (preset: ScalePresetOption) => {
		setApplyingId(preset.id);
		try {
			// 1. Применяем пресет на сервере
			const extraData: {
				numberOfChairs?: number;
				numberOfDoctors?: number;
				hasPediatricMode?: boolean;
			} = {
				numberOfChairs: preset.id === "solo_therapist" ? 1 : 3,
			};
			if (preset.customFlags.numberOfDoctors !== undefined) {
				extraData.numberOfDoctors = preset.customFlags.numberOfDoctors;
			}
			if (preset.customFlags.hasPediatricMode !== undefined) {
				extraData.hasPediatricMode = preset.customFlags.hasPediatricMode;
			}
			await applyWorkspacePreset(preset.id, extraData);

			// 2. Явно синхронизируем специфичные флаги (включая клинические правила и статус)
			await saveWorkspaceFlags({
				...preset.customFlags,
				workspacePreset: preset.id,
			});

			showToast(
				`Масштаб клиники успешно переключен: «${preset.title}»`,
				"success",
			);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка переключения масштаба",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setApplyingId(null);
		}
	};

	return (
		<div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
						<Sparkles size={18} />
					</div>
					<div>
						<h3 className="m-0 text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
							Быстрый запуск под масштаб клиники
							<span className="text-xs font-normal px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
								1 клик
							</span>
						</h3>
						<p className="m-0 text-xs text-slate-500 dark:text-slate-400">
							Выберите профиль — интерфейс мгновенно адаптируется, скрыв
							неактуальные разделы
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
				{SCALE_PRESETS.map((preset) => {
					const Icon = preset.icon;
					const isActive = activePresetId === preset.id;
					const isApplying = applyingId === preset.id;

					return (
						<div
							key={preset.id}
							className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
								isActive
									? "bg-white dark:bg-slate-850 shadow-md ring-2 ring-teal-500/40"
									: "bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-850 hover:shadow-sm"
							}`}
							style={{
								borderColor: isActive
									? preset.color
									: "var(--line, #e2e8f0)",
							}}
						>
							<div>
								<div className="flex items-start justify-between gap-2 mb-2.5">
									<div
										className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
										style={{
											background: `${preset.color}15`,
											color: preset.color,
										}}
									>
										<Icon size={20} />
									</div>
									<span
										className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
											isActive
												? "bg-teal-500 text-white font-semibold"
												: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
										}`}
									>
										{isActive ? "Активный профиль" : preset.badge}
									</span>
								</div>

								<h4 className="m-0 text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">
									{preset.title}
								</h4>
								<div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
									{preset.subtitle}
								</div>

								<div className="mb-3 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg leading-snug">
									<strong>Назначение:</strong> {preset.targetAudience}
								</div>

								<div className="space-y-1 mb-3 text-xs">
									<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
										Включено:
									</div>
									{preset.keyFeatures.map((feat) => (
										<div
											key={feat}
											className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 text-[11px] leading-snug"
										>
											<CheckCircle2
												size={13}
												className="text-emerald-500 shrink-0 mt-0.5"
											/>
											<span>{feat}</span>
										</div>
									))}
								</div>

								{preset.excludedFeatures && (
									<div className="space-y-1 mb-4 text-xs opacity-75">
										<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
											Скрыто для чистоты:
										</div>
										{preset.excludedFeatures.map((feat) => (
											<div
												key={feat}
												className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] leading-snug"
											>
												<span className="text-slate-400 font-bold shrink-0">
													—
												</span>
												<span>{feat}</span>
											</div>
										))}
									</div>
								)}
							</div>

							<button
								type="button"
								onClick={() => void handleApplyPreset(preset)}
								disabled={isActive || isApplying}
								className={`w-full mt-2 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
									isActive
										? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 cursor-default"
										: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
								}`}
							>
								{isApplying ? (
									<>
										<Loader2 size={13} className="animate-spin" />
										<span>Применение...</span>
									</>
								) : isActive ? (
									<>
										<CheckCircle2 size={13} className="text-teal-600" />
										<span>Активен</span>
									</>
								) : (
									<>
										<Flame size={13} />
										<span>Включить профиль</span>
									</>
								)}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
