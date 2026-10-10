/**
 * PhasedStageFinancialSummary.tsx — Финансовая сводка по этапам лечения
 * (согласовано / остаток / 30-40-30 эскроу / рассрочка 0% на 6, 12 и 24 мес).
 */

import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import {
	CATEGORY_ORDER,
	type CategorizedPhasedPlanData,
	type InstallmentMonthsOption,
	type PhasedStageStatus,
} from "./types";

export interface PhasedStageFinancialSummaryProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly stageStatuses: Readonly<Record<TreatmentPlanStageCategory, PhasedStageStatus>>;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
	readonly onChangeInstallmentMonths: (months: InstallmentMonthsOption) => void;
}

const INSTALLMENT_TERMS: readonly InstallmentMonthsOption[] = [6, 12, 24];

export const PhasedStageFinancialSummary: React.FC<PhasedStageFinancialSummaryProps> = ({
	categorized,
	stageStatuses,
	installmentMonths,
	installmentMonthlyRub,
	onChangeInstallmentMonths,
}) => {
	const agreedTotalRub = CATEGORY_ORDER.reduce((sum, cat) => {
		const status = stageStatuses[cat];
		if (status === "agreed" || status === "in_progress" || status === "completed") {
			return sum + categorized.map[cat].subtotalRub;
		}
		return sum;
	}, 0);

	const completedTotalRub = CATEGORY_ORDER.reduce((sum, cat) => {
		if (stageStatuses[cat] === "completed") {
			return sum + categorized.map[cat].subtotalRub;
		}
		return sum;
	}, 0);

	const remainingRub = Math.max(0, categorized.grandTotalRub - completedTotalRub);
	const stageSplit30 = Math.round(categorized.grandTotalRub * 0.3);
	const stageSplit40 = Math.round(categorized.grandTotalRub * 0.4);
	const stageSplitFinal30 = Math.max(
		0,
		categorized.grandTotalRub - stageSplit30 - stageSplit40,
	);

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-sm space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
						Финансовая сводка и график оплаты по этапам
					</div>
					<p className="text-xs text-[var(--ink-muted)] mt-0.5">
						Выберите срок рассрочки без переплат или поэтапный график 30% / 40% / 30% по мере закрытия клинических фаз.
					</p>
				</div>

				<div className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5">
					{INSTALLMENT_TERMS.map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => onChangeInstallmentMonths(m)}
							className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer min-h-[32px] ${
								installmentMonths === m
									? "bg-[var(--teal)] text-white shadow-sm"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							{m} мес
						</button>
					))}
				</div>
			</div>

			{/* 4 ключевых финансовых показателя по плану */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="text-[11px] font-medium text-[var(--ink-muted)]">
						Общий бюджет 4 фаз
					</div>
					<div className="mt-0.5 text-sm font-extrabold text-[var(--ink)] tabular-nums">
						{categorized.grandTotalRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="text-[11px] font-medium text-[var(--ink-muted)]">
						Согласовано этапов
					</div>
					<div className="mt-0.5 text-sm font-extrabold text-[var(--teal)] tabular-nums">
						{agreedTotalRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="text-[11px] font-medium text-[var(--ink-muted)]">
						Остаток к оплате
					</div>
					<div className="mt-0.5 text-sm font-extrabold text-[var(--ink)] tabular-nums">
						{remainingRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="text-[11px] font-medium text-[var(--ink-muted)]">
						Платёж ({installmentMonths} мес, 0%)
					</div>
					<div className="mt-0.5 text-sm font-extrabold text-[var(--teal)] tabular-nums">
						{installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
					</div>
				</div>
			</div>

			{/* Партнерские программы и схема 30/40/30 */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="font-bold text-[var(--ink)]">Т-Банк Рассрочка 0%</div>
					<div className="text-[var(--teal)] font-extrabold text-sm mt-0.5 tabular-nums">
						{installmentMonthlyRub.toLocaleString("ru-RU")} ₽ / мес
					</div>
					<div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
						Решение по СМС за 2 минуты без визита в банк
					</div>
				</div>
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="font-bold text-[var(--ink)]">Сбер Покупай 0%</div>
					<div className="text-[var(--teal)] font-extrabold text-sm mt-0.5 tabular-nums">
						{installmentMonthlyRub.toLocaleString("ru-RU")} ₽ / мес
					</div>
					<div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
						Одобрение в СберБанк Онлайн в 1 клик
					</div>
				</div>
				<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
					<div className="font-bold text-[var(--ink)]">
						Внутренняя рассрочка клиники (30/40/30)
					</div>
					<div className="text-[var(--ink)] font-extrabold text-xs mt-1 tabular-nums">
						Аванс 30%: {stageSplit30.toLocaleString("ru-RU")} ₽ · Хирургия 40%:{" "}
						{stageSplit40.toLocaleString("ru-RU")} ₽ · Финал 30%:{" "}
						{stageSplitFinal30.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
						Прямой договор с клиникой без участия банка
					</div>
				</div>
			</div>
		</div>
	);
};
