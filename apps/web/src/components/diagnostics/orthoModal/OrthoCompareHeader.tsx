import React from "react";
import { Columns, Split } from "lucide-react";
import type { OrthodonticAngleDefinition } from "@dental/shared";

interface OrthoCompareHeaderProps {
	activeAngle: OrthodonticAngleDefinition;
	compareViewMode: "side_by_side" | "slider";
	setCompareViewMode: (mode: "side_by_side" | "slider") => void;
	onCloseCompare: () => void;
}

export const OrthoCompareHeader: React.FC<OrthoCompareHeaderProps> = ({
	activeAngle,
	compareViewMode,
	setCompareViewMode,
	onCloseCompare,
}) => {
	return (
		<div className="flex items-center justify-between flex-wrap gap-2">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0">
					<Split size={16} />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">Сравнение До / После в 1 клик</h3>
					<p className="text-xs text-[var(--muted)] m-0">
						Динамика перемещения зубов, смыкания и улыбки · {activeAngle.titleRu}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<div className="bg-[var(--paper)] p-0.5 rounded-xl border border-[var(--line)] flex items-center gap-1">
					<button
						type="button"
						onClick={() => setCompareViewMode("side_by_side")}
						data-testid="compare-mode-side-by-side-btn"
						className={`min-h-[36px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
							compareViewMode === "side_by_side"
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<Columns size={13} />
						<span>Рядом</span>
					</button>
					<button
						type="button"
						onClick={() => setCompareViewMode("slider")}
						data-testid="compare-mode-slider-btn"
						className={`min-h-[36px] sm:min-h-[28px] sm:h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
							compareViewMode === "slider"
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<Split size={13} />
						<span>Шторка</span>
					</button>
				</div>

				<button
					type="button"
					onClick={onCloseCompare}
					data-testid="close-compare-panel-btn"
					className="secondary-button min-h-[36px] sm:min-h-[28px] sm:h-7 px-2.5 text-xs font-semibold !rounded-xl cursor-pointer"
				>
					К сетке 8 фото
				</button>
			</div>
		</div>
	);
};
