/**
 * apps/web/src/components/patients/formula/FormulaStampBar.tsx
 *
 * Панель быстрого штампа и индикатор статуса сохранения (Мандаты 8e, 8b)
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { ToothState } from "../../odontogram/ToothChart";
import { STAMP_OPTIONS } from "./formulaConstants";

interface FormulaStampBarProps {
	readonly activeStamp: ToothState | null;
	readonly onSelectStamp: (state: ToothState) => void;
	readonly onResetStamp: () => void;
	readonly selectedTeeth: readonly number[];
	readonly lastSavedTime: string;
}

export const FormulaStampBar: React.FC<FormulaStampBarProps> = React.memo(
	function FormulaStampBar({
		activeStamp,
		onSelectStamp,
		onResetStamp,
		selectedTeeth,
		lastSavedTime,
	}) {
		return (
			<div className="flex items-center justify-between gap-1.5 flex-wrap p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)]">
				<div className="flex items-center gap-1 flex-wrap">
					<span className="text-[11px] font-bold text-[var(--muted)] px-1">
						Быстрый штамп:
					</span>
					{STAMP_OPTIONS.map((opt) => {
						const isSelected = activeStamp === opt.state;
						return (
							<button
								key={opt.state}
								type="button"
								onClick={() => onSelectStamp(opt.state)}
								className={`min-h-[26px] h-6.5 px-2 text-[11px] font-bold rounded-md transition-all cursor-pointer inline-flex items-center gap-1 ${
									isSelected
										? `${opt.colorClass} shadow-xs ring-1 ring-white/50`
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--glass-border)] hover:border-[var(--teal)]"
								}`}
							>
								<span>{opt.label}</span>
							</button>
						);
					})}

					{activeStamp && (
						<button
							type="button"
							onClick={onResetStamp}
							className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)] font-bold px-1.5 underline cursor-pointer"
						>
							Сброс штампа
						</button>
					)}
				</div>

				<div className="flex items-center gap-2">
					{selectedTeeth.length > 0 && (
						<span className="text-xs font-bold text-[var(--teal)] bg-teal-500/10 px-2 py-0.5 rounded-md">
							Выбрано зубов: {selectedTeeth.join(", ")}
						</span>
					)}
					{lastSavedTime && (
						<span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
							<CheckCircle2 className="w-3 h-3 text-emerald-500" />
							<span>Сохранено: {lastSavedTime}</span>
						</span>
					)}
				</div>
			</div>
		);
	},
);

FormulaStampBar.displayName = "FormulaStampBar";
