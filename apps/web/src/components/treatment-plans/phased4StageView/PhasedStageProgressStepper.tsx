/**
 * PhasedStageProgressStepper.tsx — Шапка 4-стадийного плана и визуальный
 * прогресс-степпер клинических фаз со сроками заживления, бюджетом и % выполнения.
 */

import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import {
	CATEGORY_ORDER,
	STAGE_STATUS_META,
	STAGE_TIMELINE_LABELS,
	type CategorizedPhasedPlanData,
	type InstallmentMonthsOption,
	type PhasedStageStatus,
} from "./types";

export interface PhasedStageProgressStepperProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly planTierTitle: string;
	readonly patientName?: string | undefined;
	readonly formattedPlanAgeBadge: string;
	readonly isExpired: boolean;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
	readonly stageStatuses: Readonly<Record<TreatmentPlanStageCategory, PhasedStageStatus>>;
	readonly expandedStages: Readonly<Record<TreatmentPlanStageCategory, boolean>>;
	readonly onSelectStageStep: (category: TreatmentPlanStageCategory) => void;
}

const STEP_SHORT_TITLES: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation: "1. Санация и гигиена",
	endo_therapy: "2. Терапия и каналы",
	surgery_implant: "3. Хирургия и имплантация",
	ortho_prosthetics: "4. Ортопедия и коронки",
};

export const PhasedStageProgressStepper: React.FC<PhasedStageProgressStepperProps> = ({
	categorized,
	planTierTitle,
	patientName,
	formattedPlanAgeBadge,
	isExpired,
	installmentMonths,
	installmentMonthlyRub,
	stageStatuses,
	expandedStages,
	onSelectStageStep,
}) => {
	const activeCategories = CATEGORY_ORDER.filter(
		(cat) => categorized.map[cat].items.length > 0,
	);
	const totalActiveStages = activeCategories.length || 1;
	const completedOrAgreedCount = activeCategories.filter((cat) => {
		const status = stageStatuses[cat];
		return status === "completed" || status === "in_progress" || status === "agreed";
	}).length;
	const completionPercent = Math.round(
		(completedOrAgreedCount / totalActiveStages) * 100,
	);

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-sm space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2 flex-wrap">
						<span className="inline-flex items-center rounded-md bg-[color-mix(in_srgb,var(--teal)_12%,var(--paper))] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal)] border border-[color-mix(in_srgb,var(--teal)_28%,transparent)]">
							4 клинических этапа: Пошаговая реабилитация
						</span>
						{patientName && (
							<span className="text-xs font-medium text-[var(--ink-muted)]">
								Пациент:{" "}
								<strong className="text-[var(--ink)]">{patientName}</strong>
							</span>
						)}
						<span
							data-testid="phased-expired-unblocked-badge"
							className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
								isExpired
									? "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
									: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]"
							}`}
						>
							<svg
								className="w-3 h-3 shrink-0 text-[var(--teal)]"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							{formattedPlanAgeBadge}
						</span>
					</div>
					<h3 className="mt-1 text-base font-bold text-[var(--ink)]">
						{planTierTitle} — Разбивка по медицинским фазам (приказ Минздрава № 804н)
					</h3>
					<p className="text-xs text-[var(--ink-muted)] mt-0.5">
						Оплата и запись производятся поэтапно по мере приживления и завершения предыдущей клинической фазы.
					</p>
				</div>

				<div className="flex items-center gap-4">
					<div className="text-right">
						<div className="text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
							Итоговая смета 4 этапов
						</div>
						<div className="text-xl font-extrabold text-[var(--ink)] tabular-nums">
							{categorized.grandTotalRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-[11px] font-medium text-[var(--teal)] tabular-nums">
							Рассрочка 0% ({installmentMonths} мес):{" "}
							{installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
						</div>
					</div>
				</div>
			</div>

			{/* Полоса прогресса реабилитации и 4-стадийный степпер */}
			<div className="pt-3 border-t border-[var(--line)] space-y-2.5">
				<div className="flex items-center justify-between text-xs">
					<span className="font-semibold text-[var(--ink)]">
						Маршрут реабилитации ({categorized.totalItemsCount} манипуляций в 4 фазах)
					</span>
					<span className="font-semibold text-[var(--teal)] tabular-nums">
						Готовность маршрута: {completionPercent}%
					</span>
				</div>
				<div className="h-1.5 w-full rounded-full bg-[var(--paper-soft)] overflow-hidden border border-[var(--line)]">
					<div
						className="h-full bg-[var(--teal)] transition-all duration-300"
						style={{ width: `${Math.max(completionPercent, 8)}%` }}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
					{CATEGORY_ORDER.map((cat, idx) => {
						const stageData = categorized.map[cat];
						const status = stageStatuses[cat];
						const statusMeta = STAGE_STATUS_META[status];
						const isExpanded = expandedStages[cat];
						const hasItems = stageData.items.length > 0;

						return (
							<button
								key={cat}
								type="button"
								onClick={() => onSelectStageStep(cat)}
								className={`text-left rounded-lg border p-2.5 transition-colors cursor-pointer min-h-[44px] flex flex-col justify-between ${
									isExpanded
										? "border-[var(--teal)] bg-[color-mix(in_srgb,var(--teal)_6%,var(--paper))]"
										: "border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)]"
								}`}
							>
								<div className="flex items-center justify-between gap-1.5">
									<span className="text-xs font-bold text-[var(--ink)] truncate">
										{STEP_SHORT_TITLES[cat] || `${idx + 1}. ${stageData.meta.labelRu}`}
									</span>
									<span
										className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border shrink-0 ${statusMeta.badgeClass}`}
									>
										{statusMeta.label}
									</span>
								</div>
								<div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
									<span className="text-[var(--ink-muted)] truncate">
										{STAGE_TIMELINE_LABELS[cat]}
									</span>
									<span className="font-bold text-[var(--ink)] tabular-nums shrink-0">
										{hasItems
											? `${stageData.subtotalRub.toLocaleString("ru-RU")} ₽`
											: "0 ₽"}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
