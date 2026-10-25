import React from "react";
import type { VerticalAnomaly, TransversalAnomaly } from "@dental/shared";

export interface VerticalTransversalSelectorProps {
	readonly verticalAnomaly: VerticalAnomaly;
	readonly setVerticalAnomaly: (v: VerticalAnomaly) => void;
	readonly transversalAnomaly: TransversalAnomaly;
	readonly setTransversalAnomaly: (t: TransversalAnomaly) => void;
}

export const VerticalTransversalSelector: React.FC<VerticalTransversalSelectorProps> = ({
	verticalAnomaly,
	setVerticalAnomaly,
	transversalAnomaly,
	setTransversalAnomaly,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
			<div className="flex flex-col gap-1">
				<span className="text-xs font-semibold text-[var(--muted)]">Вертикальное перекрытие:</span>
				<div className="grid grid-cols-3 gap-1">
					<button
						type="button"
						onClick={() => setVerticalAnomaly("norm")}
						data-testid="vertical-norm-btn"
						className={`min-h-[40px] sm:min-h-[36px] sm:h-9 px-1.5 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
							verticalAnomaly === "norm"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Норма (1/3)
					</button>
					<button
						type="button"
						onClick={() => setVerticalAnomaly("deep")}
						data-testid="vertical-deep-btn"
						className={`min-h-[40px] sm:min-h-[36px] sm:h-9 px-1.5 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
							verticalAnomaly === "deep"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Глубокий
					</button>
					<button
						type="button"
						onClick={() => setVerticalAnomaly("open")}
						data-testid="vertical-open-btn"
						className={`min-h-[40px] sm:min-h-[36px] sm:h-9 px-1.5 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
							verticalAnomaly === "open"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Открытый
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<span className="text-xs font-semibold text-[var(--muted)]">Трансверзальное соотношение:</span>
				<div className="grid grid-cols-2 gap-1">
					<button
						type="button"
						onClick={() => setTransversalAnomaly("norm")}
						data-testid="transversal-norm-btn"
						className={`min-h-[40px] sm:min-h-[36px] sm:h-9 px-2 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
							transversalAnomaly === "norm"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Норма
					</button>
					<button
						type="button"
						onClick={() => setTransversalAnomaly("crossbite")}
						data-testid="transversal-crossbite-btn"
						className={`min-h-[40px] sm:min-h-[36px] sm:h-9 px-2 py-1 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
							transversalAnomaly === "crossbite"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Перекрестный
					</button>
				</div>
			</div>
		</div>
	);
};
