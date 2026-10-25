import { RotateCcw, Scan, Sliders } from "lucide-react";
import React from "react";

interface DoctorCbctCardHeaderProps {
	isCanonical: boolean;
	onReset: () => void;
	onOpenTuner: () => void;
}

export function DoctorCbctCardHeader({
	isCanonical,
	onReset,
	onOpenTuner,
}: DoctorCbctCardHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0">
					<Scan size={18} />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h4 className="m-0 text-sm font-bold text-[var(--ink)]">
							Параметры КЛКТ по умолчанию
						</h4>
						{isCanonical ? (
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
								Канон (4025/525)
							</span>
						) : (
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
								Персональный дефолт
							</span>
						)}
					</div>
					<p className="m-0 text-xs text-[var(--muted)]">
						Базовый контраст, гамма-кривая, толщина срезов и метод интерполяции при открытии КЛКТ пациента
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 w-full sm:w-auto">
				{!isCanonical && (
					<button
						type="button"
						onClick={onReset}
						className="h-11 min-h-[44px] sm:h-9 sm:min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
						title="Сбросить все параметры на канон"
					>
						<RotateCcw size={13} className="shrink-0" />
						<span>Сброс на канон</span>
					</button>
				)}

				<button
					type="button"
					onClick={onOpenTuner}
					className="h-11 min-h-[44px] sm:h-9 sm:min-h-[36px] px-3.5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
					data-testid="button-open-cbct-tuner"
				>
					<Sliders size={14} className="shrink-0" />
					<span>Калибровать КЛКТ</span>
				</button>
			</div>
		</div>
	);
}
