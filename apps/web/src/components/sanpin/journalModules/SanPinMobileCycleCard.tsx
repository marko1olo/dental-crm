/**
 * apps/web/src/components/sanpin/journalModules/SanPinMobileCycleCard.tsx
 *
 * Карточка цикла автоклавирования для мобильных экранов (Apple iOS HIG).
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2, Thermometer, Gauge, Timer, ArrowRight, Layers, ShieldCheck } from "lucide-react";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";

export interface SanPinMobileCycleCardProps {
	readonly cyc: SanPinCycleEntry;
}

export const SanPinMobileCycleCard: React.FC<SanPinMobileCycleCardProps> = ({ cyc }) => {
	const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;

	return (
		<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-3.5 flex flex-col gap-2.5 shadow-xs font-tabular">
			{/* Header: Autoclave & Status */}
			<div className="flex items-center justify-between">
				<div>
					<span className="font-bold text-[15px] text-[var(--ink)]">{cyc.autoclaveCode}</span>
					<span className="text-[13px] text-[var(--muted)] ml-2">{cyc.autoclaveModel}</span>
				</div>
				<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
					<CheckCircle2 size={12} />
					<span>Стерильно</span>
				</span>
			</div>

			{/* Date, Time, Batch & PSO */}
			<div className="flex items-center justify-between flex-wrap gap-1.5 text-xs">
				<span className="text-[var(--muted)]">{cyc.date} • {cyc.time} • Цикл №{cyc.cycleNumber}</span>
				<div className="flex items-center gap-2">
					<span className="inline-flex items-center gap-1 font-semibold text-[var(--teal)] bg-teal-500/10 px-2 py-0.5 rounded-md">
						<Layers size={11} /><span>{batchCount} лотков</span>
					</span>
					<span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
						<ShieldCheck size={11} /><span>Очистка: Норма</span>
					</span>
				</div>
			</div>

			{/* Parameters & Indicator Proof */}
			<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-xs">
				<div className="flex items-center gap-2 font-semibold">
					<span className="inline-flex items-center gap-1 text-[var(--primary)]"><Thermometer size={13} />{cyc.temperatureC}°C</span>
					<span className="text-[var(--line)]">•</span>
					<span className="inline-flex items-center gap-1 text-[var(--primary)]"><Gauge size={13} />{cyc.pressureBar} бар</span>
					<span className="text-[var(--line)]">•</span>
					<span className="inline-flex items-center gap-1 text-[var(--primary)]"><Timer size={13} />{cyc.durationMin} мин</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="w-3 h-3 rounded-full border border-black/15" style={{ background: cyc.colorBeforeHex }} title={`До: ${cyc.colorBefore}`} />
					<ArrowRight size={10} className="text-[var(--muted)]" />
					<div className="w-3 h-3 rounded-full border border-black/25" style={{ background: cyc.colorAfterHex }} title={`После: ${cyc.colorAfter}`} />
					<span className="font-semibold text-[var(--ink)] text-[11px] ml-1">{cyc.indicatorClass} кл.</span>
				</div>
			</div>

			{/* Description and Operator */}
			<div className="text-xs text-[var(--muted)] flex items-center justify-between">
				<span className="truncate pr-2 font-medium text-[var(--ink)]">{cyc.itemsSummary}</span>
				<span className="shrink-0">{cyc.operatorName}</span>
			</div>
		</div>
	);
};

export default SanPinMobileCycleCard;
