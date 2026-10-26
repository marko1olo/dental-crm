import React from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { ShiftSummaryData } from "./batchWriteoffTypes.js";

interface BatchWriteoffShiftTabProps {
	readonly selectedShiftBundle: "therapy" | "orthopedics" | "surgery";
	readonly setSelectedShiftBundle: (b: "therapy" | "orthopedics" | "surgery") => void;
	readonly summaryData?: ShiftSummaryData | null;
}

export const BatchWriteoffShiftTab: React.FC<BatchWriteoffShiftTabProps> = ({
	selectedShiftBundle,
	setSelectedShiftBundle,
	summaryData,
}) => {
	const completedVisits = summaryData?.shiftStats.completedVisitsCount ?? 6;
	const dateStr = summaryData?.date ?? new Date().toISOString().slice(0, 10);
	const overdraftCount = summaryData?.overdraftItemsCount ?? 0;

	return (
		<div className="space-y-3.5 text-xs">
			<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<div className="flex items-center gap-1.5 font-bold text-sm text-[var(--ink)]">
						<Clock size={16} className="text-teal-600" />
						<span>Оказано услуг за сегодня ({dateStr})</span>
					</div>
					<p className="text-xs text-[var(--muted)] mt-0.5">
						Закрытых визитов: <strong>{completedVisits}</strong> • Профиль списания:
					</p>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{(["therapy", "orthopedics", "surgery"] as const).map((b) => (
						<button
							key={b}
							type="button"
							onClick={() => setSelectedShiftBundle(b)}
							className={`h-8 px-3 text-xs font-semibold rounded-lg border transition ${
								selectedShiftBundle === b
									? "bg-teal-600 text-white border-teal-600"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line)]/10"
							}`}
						>
							{b === "therapy" ? "Терапия" : b === "orthopedics" ? "Ортопедия" : "Хирургия"}
						</button>
					))}
				</div>
			</div>

			{overdraftCount > 0 ? (
				<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
					<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div>
						<strong className="font-bold block">Мягкий овердрафт активен для {overdraftCount} поз.</strong>
						<span>Прием и касса не блокируются. Отрицательный остаток зафиксирован в журнале.</span>
					</div>
				</div>
			) : (
				<div className="p-2.5 rounded-xl border border-teal-500/20 bg-teal-500/5 text-xs text-[var(--ink)] flex items-center gap-2.5">
					<CheckCircle2 size={16} className="text-teal-600 shrink-0" />
					<span>Остатки на складе в норме • Списание по технологическим картам визитов</span>
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
					<span className="text-[var(--muted)] block">Базовый набор приёма</span>
					<strong className="text-sm text-[var(--ink)] block mt-0.5">{completedVisits} наборов</strong>
					<span className="text-[11px] text-[var(--muted)]">Перчатки, маски, слюноотсосы, валики</span>
				</div>
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
					<span className="text-[var(--muted)] block">Местная анестезия</span>
					<strong className="text-sm text-[var(--ink)] block mt-0.5">8 карпул (Артикаин)</strong>
					<span className="text-[11px] text-[var(--muted)]">Иглы 0.3x21мм, антисептики</span>
				</div>
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
					<span className="text-[var(--muted)] block">Стерилизация лотков</span>
					<strong className="text-sm text-[var(--ink)] block mt-0.5">{completedVisits} крафт-пакетов</strong>
					<span className="text-[11px] text-[var(--muted)]">Индикаторы 5 класса, азопирам</span>
				</div>
			</div>

			<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[11px] text-[var(--muted)]">
				Врач и ассистент не тратят время на набивку отдельных строк. Списание формируется пакетом за всю смену в 1 клик.
			</div>
		</div>
	);
};
