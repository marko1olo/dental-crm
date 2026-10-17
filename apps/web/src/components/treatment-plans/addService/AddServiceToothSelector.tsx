import React from "react";

export interface AddServiceToothSelectorProps {
	readonly selectedTooth: number | null;
	readonly onSelectTooth: (tooth: number | null) => void;
}

const UPPER_Q1 = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_Q2 = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_Q4 = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_Q3 = [31, 32, 33, 34, 35, 36, 37, 38];

export const AddServiceToothSelector: React.FC<AddServiceToothSelectorProps> = ({
	selectedTooth,
	onSelectTooth,
}) => {
	const renderToothBtn = (t: number) => {
		const isCurrent = selectedTooth === t;
		return (
			<button
				key={t}
				type="button"
				onClick={() => onSelectTooth(isCurrent ? null : t)}
				className={`w-6 h-7 sm:w-7 sm:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
					isCurrent
						? "bg-[var(--teal)] text-white shadow-xs font-black"
						: "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
				}`}
			>
				{t}
			</button>
		);
	};

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<label className="text-[11px] font-bold text-[var(--muted)]">
					Привязка к зубу (FDI ISO 3950):
				</label>
				<button
					type="button"
					onClick={() => onSelectTooth(null)}
					className={`text-xs px-2.5 py-1 min-h-[28px] rounded-lg font-bold cursor-pointer transition-colors ${
						selectedTooth === null
							? "bg-[var(--teal)] text-white"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
					}`}
				>
					Без зуба / Общая
				</button>
			</div>

			<div className="space-y-1.5 bg-[var(--paper-soft)] p-2 sm:p-2.5 rounded-xl border border-[var(--line)]">
				<div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-mono font-bold overflow-x-auto">
					<span className="text-[10px] text-[var(--muted)] mr-1 shrink-0">В/Ч:</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{UPPER_Q1.map(renderToothBtn)}</div>
					<span className="text-[var(--line)] font-normal mx-0.5 shrink-0">|</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{UPPER_Q2.map(renderToothBtn)}</div>
				</div>

				<div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-mono font-bold overflow-x-auto">
					<span className="text-[10px] text-[var(--muted)] mr-1 shrink-0">Н/Ч:</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{LOWER_Q4.map(renderToothBtn)}</div>
					<span className="text-[var(--line)] font-normal mx-0.5 shrink-0">|</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{LOWER_Q3.map(renderToothBtn)}</div>
				</div>
			</div>
		</div>
	);
};
