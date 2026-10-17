/**
 * ShiftBatchProcedureTab.tsx — Таб списания материалов по клиническому протоколу процедуры (BOM).
 * Входит в единый SSOT ShiftBatchDeductionModal (Мандаты 8e, 8n).
 */

import React from "react";
import { ShieldCheck } from "lucide-react";

export interface ShiftBatchProcedureTabProps {
	readonly procedureTitle?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly service804nCode?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
}

export const ShiftBatchProcedureTab: React.FC<ShiftBatchProcedureTabProps> = ({
	procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
	serviceCode,
	service804nCode = "A16.07.002.011",
	toothNumber = 16,
	doctorName = "Кузнецов А.В.",
	patientName = "Смирнова Е.А.",
	currentStockMap,
}) => {
	return (
		<div className="space-y-3">
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap text-xs">
				<div className="space-y-0.5">
					<div className="font-bold text-[var(--ink)]">
						{procedureTitle} {toothNumber ? `(Зуб ${toothNumber})` : ""}
					</div>
					<div className="text-[11px] text-[var(--muted)] font-mono">
						Код: {serviceCode || service804nCode} • Врач: {doctorName} • Пациент: {patientName}
					</div>
				</div>

				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
					<ShieldCheck size={14} className="text-teal-600" />
					<span>Протокол Минздрава</span>
				</div>
			</div>

			<div className="rounded-xl border border-[var(--line)] divide-y divide-[var(--line)] bg-[var(--paper)]">
				<div className="p-3 flex items-center justify-between text-xs hover:bg-[var(--paper-soft)] transition-colors">
					<div className="space-y-0.5">
						<div className="font-semibold text-[var(--ink)]">
							Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)
						</div>
						<div className="text-[11px] text-[var(--muted)] font-mono">
							Анестезия • на складе: {currentStockMap?.["art_100k_carpule"] ?? 24} карп.
						</div>
					</div>
					<span className="font-bold text-xs font-mono tabular-nums">1 карп.</span>
				</div>

				<div className="p-3 flex items-center justify-between text-xs hover:bg-[var(--paper-soft)] transition-colors">
					<div className="space-y-0.5">
						<div className="font-semibold text-[var(--ink)]">
							Игла карпульная 30G евростандарт 25 мм
						</div>
						<div className="text-[11px] text-[var(--muted)] font-mono">
							Анестезия • на складе: {currentStockMap?.["dental_needle_30g"] ?? 80} шт.
						</div>
					</div>
					<span className="font-bold text-xs font-mono tabular-nums">1 шт.</span>
				</div>

				<div className="p-3 flex items-center justify-between text-xs hover:bg-[var(--paper-soft)] transition-colors">
					<div className="space-y-0.5">
						<div className="font-semibold text-[var(--ink)]">
							Перчатки смотровые нитриловые неопудренные (пара)
						</div>
						<div className="text-[11px] text-[var(--muted)] font-mono">
							СИЗ • на складе: {currentStockMap?.["nitrile_gloves_pair"] ?? 140} пар
						</div>
					</div>
					<span className="font-bold text-xs font-mono tabular-nums">2 пар</span>
				</div>

				<div className="p-3 flex items-center justify-between text-xs hover:bg-[var(--paper-soft)] transition-colors">
					<div className="space-y-0.5">
						<div className="font-semibold text-[var(--ink)]">
							Светоотверждаемый нанокомпозит (Filtek / Estelite)
						</div>
						<div className="text-[11px] text-[var(--muted)] font-mono">
							Терапия • на складе: {currentStockMap?.["composite_nano_shade"] ?? 8} г
						</div>
					</div>
					<span className="font-bold text-xs font-mono tabular-nums">0.2 г</span>
				</div>

				<div className="p-3 flex items-center justify-between text-xs hover:bg-[var(--paper-soft)] transition-colors">
					<div className="space-y-0.5">
						<div className="font-semibold text-[var(--ink)]">
							Адгезив стоматологический универсальный
						</div>
						<div className="text-[11px] text-[var(--muted)] font-mono">
							Терапия • на складе: {currentStockMap?.["dental_adhesive_universal"] ?? 3} мл
						</div>
					</div>
					<span className="font-bold text-xs font-mono tabular-nums">0.1 мл</span>
				</div>
			</div>
		</div>
	);
};

export default ShiftBatchProcedureTab;
