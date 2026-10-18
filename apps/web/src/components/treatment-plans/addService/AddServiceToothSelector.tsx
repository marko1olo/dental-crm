import React from "react";
import { AnatomicalToothSVG } from "../../odontogram/AnatomicalToothSVG";

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
	const renderToothBtn = (t: number, isUpper: boolean) => {
		const isCurrent = selectedTooth === t;
		return (
			<button
				key={t}
				type="button"
				onClick={() => onSelectTooth(isCurrent ? null : t)}
				className={`min-w-[30px] sm:min-w-[36px] min-h-[46px] p-0.5 rounded-lg flex flex-col items-center justify-between cursor-pointer transition-all border ${
					isCurrent
						? "bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500 ring-2 ring-teal-500/40 shadow-xs font-bold"
						: "bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500/60 hover:bg-teal-50/20 border-[var(--line)]"
				}`}
				title={`Зуб ${t}`}
			>
				{isUpper ? (
					<>
						<span className="text-[10px] sm:text-[11px] font-mono font-bold leading-none">{t}</span>
						<div className="w-4 h-6 flex items-center justify-center overflow-hidden pointer-events-none">
							<AnatomicalToothSVG number={t} state="Healthy" scale={0.24} onClick={() => {}} />
						</div>
					</>
				) : (
					<>
						<div className="w-4 h-6 flex items-center justify-center overflow-hidden pointer-events-none">
							<AnatomicalToothSVG number={t} state="Healthy" scale={0.24} onClick={() => {}} />
						</div>
						<span className="text-[10px] sm:text-[11px] font-mono font-bold leading-none">{t}</span>
					</>
				)}
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
					className={`text-xs px-2.5 py-1 min-h-[30px] rounded-lg font-bold cursor-pointer transition-colors ${
						selectedTooth === null
							? "bg-[var(--teal)] text-white shadow-xs"
							: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
					}`}
				>
					Без зуба / Общая
				</button>
			</div>

			<div className="space-y-2 bg-[var(--paper-soft)] p-2 sm:p-2.5 rounded-xl border border-[var(--line)]">
				<div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-mono font-bold overflow-x-auto">
					<span className="text-[10px] text-[var(--muted)] mr-1 shrink-0 font-sans">В/Ч:</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{UPPER_Q1.map((t) => renderToothBtn(t, true))}</div>
					<span className="text-[var(--line)] font-normal mx-0.5 shrink-0">|</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{UPPER_Q2.map((t) => renderToothBtn(t, true))}</div>
				</div>

				<div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-mono font-bold overflow-x-auto">
					<span className="text-[10px] text-[var(--muted)] mr-1 shrink-0 font-sans">Н/Ч:</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{LOWER_Q4.map((t) => renderToothBtn(t, false))}</div>
					<span className="text-[var(--line)] font-normal mx-0.5 shrink-0">|</span>
					<div className="flex items-center gap-0.5 sm:gap-1 shrink-0">{LOWER_Q3.map((t) => renderToothBtn(t, false))}</div>
				</div>
			</div>
		</div>
	);
};
