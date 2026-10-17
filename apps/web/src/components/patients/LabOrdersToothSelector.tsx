import type React from "react";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

interface LabOrdersToothSelectorProps {
	selectedTeeth: number[];
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	restorationType: string;
}

export const LabOrdersToothSelector: React.FC<LabOrdersToothSelectorProps> = ({
	selectedTeeth,
	setSelectedTeeth,
	restorationType,
}) => {
	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const selectQuadrant = (teeth: number[]) => {
		setSelectedTeeth((prev) => {
			const allSelected = teeth.every((t) => prev.includes(t));
			if (allSelected) {
				return prev.filter((t) => !teeth.includes(t));
			}
			return Array.from(new Set([...prev, ...teeth])).sort((a, b) => a - b);
		});
	};

	const toothLabel = selectedTeeth.length > 0
		? restorationType === "bridge" && selectedTeeth.length > 1
			? `${selectedTeeth[0]}–${selectedTeeth[selectedTeeth.length - 1]} (мост, ${selectedTeeth.length} ед.: ${selectedTeeth.join(", ")})`
			: selectedTeeth.join(", ")
		: "не выбрано";

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-xs text-[var(--muted)] flex-wrap gap-1">
				<span className="font-medium">
					Зубы по FDI: <strong className="text-[var(--ink)]">{toothLabel}</strong>
				</span>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={() => selectQuadrant(UPPER_TEETH)}
						className="px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] transition-colors"
					>
						Верхняя
					</button>
					<button
						type="button"
						onClick={() => selectQuadrant(LOWER_TEETH)}
						className="px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] transition-colors"
					>
						Нижняя
					</button>
					{selectedTeeth.length > 0 && (
						<button
							type="button"
							onClick={() => setSelectedTeeth([])}
							className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
						>
							Сбросить
						</button>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-1">
				{UPPER_TEETH.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => toggleTooth(t)}
						className={`min-h-[28px] h-7 px-1.5 rounded-md text-xs font-bold font-mono border transition-all ${
							selectedTeeth.includes(t)
								? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
						}`}
						title={`Зуб ${t}`}
					>
						{t}
					</button>
				))}
			</div>

			<div className="flex flex-wrap gap-1">
				{LOWER_TEETH.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => toggleTooth(t)}
						className={`min-h-[28px] h-7 px-1.5 rounded-md text-xs font-bold font-mono border transition-all ${
							selectedTeeth.includes(t)
								? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
						}`}
						title={`Зуб ${t}`}
					>
						{t}
					</button>
				))}
			</div>
		</div>
	);
};
