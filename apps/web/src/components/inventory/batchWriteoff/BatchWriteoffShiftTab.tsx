import React from "react";
import { CheckCircle2 } from "lucide-react";

interface BatchWriteoffShiftTabProps {
	readonly selectedShiftBundle: "therapy" | "orthopedics" | "surgery";
	readonly setSelectedShiftBundle: (b: "therapy" | "orthopedics" | "surgery") => void;
}

export const BatchWriteoffShiftTab: React.FC<BatchWriteoffShiftTabProps> = ({
	selectedShiftBundle,
	setSelectedShiftBundle,
}) => {
	return (
		<div className="space-y-4">
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)]">Пакет смены по профилю отделения:</h3>
					<p className="text-xs text-[var(--muted)] mt-0.5">
						Автоматическое списание базовых комплектов (перчатки, маски, валики, слюноотсосы, анестетики)
					</p>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{(["therapy", "orthopedics", "surgery"] as const).map((b) => (
						<button
							key={b}
							type="button"
							onClick={() => setSelectedShiftBundle(b)}
							className={`h-9 px-3 text-xs font-semibold rounded-lg border transition ${
								selectedShiftBundle === b
									? "bg-[var(--primary)] text-white border-[var(--primary)]"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line)]/10"
							}`}
						>
							{b === "therapy" ? "Терапия" : b === "orthopedics" ? "Ортопедия" : "Хирургия"}
						</button>
					))}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
					<span className="text-[var(--muted)] block">Базовый комплект приёма</span>
					<strong className="text-sm text-[var(--ink)] block mt-1">10 приёмов / смену</strong>
					<span className="text-[11px] text-[var(--muted)]">Перчатки, маски, слюноотсосы, валики</span>
				</div>

				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
					<span className="text-[var(--muted)] block">Местная анестезия</span>
					<strong className="text-sm text-[var(--ink)] block mt-1">12 карпул (Артикаин)</strong>
					<span className="text-[11px] text-[var(--muted)]">Иглы карпульные 0.3x21мм, карпулы</span>
				</div>

				<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]">
					<span className="text-[var(--muted)] block">Стерилизация лотков ЦСО</span>
					<strong className="text-sm text-[var(--ink)] block mt-1">10 крафт-пакетов</strong>
					<span className="text-[11px] text-[var(--muted)]">Индикаторы 5 класса, дезрастворы</span>
				</div>
			</div>

			<div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 text-xs text-[var(--ink)] flex items-center gap-3">
				<CheckCircle2 size={18} className="text-teal-600 shrink-0" />
				<span>
					Врач и ассистент не тратят время на набивку отдельных строк. Списание формируется пакетом за всю смену в 1 клик.
				</span>
			</div>
		</div>
	);
};
