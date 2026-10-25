import React from "react";
import type { SagittalAnomaly } from "@dental/shared";

export interface SagittalAnomalySelectorProps {
	readonly sagittalAnomaly: SagittalAnomaly;
	readonly setSagittalAnomaly: (s: SagittalAnomaly) => void;
	readonly sagittalGapMm: number;
	readonly setSagittalGapMm: (mm: number) => void;
}

export const SagittalAnomalySelector: React.FC<SagittalAnomalySelectorProps> = ({
	sagittalAnomaly,
	setSagittalAnomaly,
	sagittalGapMm,
	setSagittalGapMm,
}) => {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
				<span>Сагиттальная щель (оверджет):</span>
				{sagittalAnomaly === "overjet" && (
					<span className="font-bold text-[var(--primary)]">{sagittalGapMm} мм</span>
				)}
			</div>
			<div className="grid grid-cols-3 gap-1.5">
				<button
					type="button"
					onClick={() => {
						setSagittalAnomaly("norm");
						setSagittalGapMm(2);
					}}
					data-testid="sagittal-norm-btn"
					className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
						sagittalAnomaly === "norm"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Норма (1–2 мм)
				</button>
				<button
					type="button"
					onClick={() => {
						setSagittalAnomaly("overjet");
						setSagittalGapMm(sagittalGapMm <= 2 ? 4 : sagittalGapMm);
					}}
					data-testid="sagittal-overjet-btn"
					className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
						sagittalAnomaly === "overjet"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Оверджет (&gt;2 мм)
				</button>
				<button
					type="button"
					onClick={() => setSagittalAnomaly("reverse")}
					data-testid="sagittal-reverse-btn"
					className={`min-h-[44px] sm:min-h-[36px] sm:h-9 px-2 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
						sagittalAnomaly === "reverse"
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Обратный прикус
				</button>
			</div>
		</div>
	);
};
