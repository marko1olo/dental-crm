import React from "react";
import { RotateCcw } from "lucide-react";
import { BracesBracket } from "../icons/DentalIcons";
import {
	UPPER_TEETH,
	LOWER_TEETH,
	ANTERIOR_TEETH,
	type TargetArch,
} from "./orthoProtocolTypes";

export interface OrthoDentalArchSectionProps {
	readonly targetArch: TargetArch;
	readonly onSelectArch: (arch: TargetArch) => void;
	readonly selectedTeeth: number[];
	readonly onToggleTooth: (tooth: number) => void;
	readonly onSelectAnterior: () => void;
	readonly onClearTeeth: () => void;
}

export const OrthoDentalArchSection: React.FC<OrthoDentalArchSectionProps> = ({
	targetArch,
	onSelectArch,
	selectedTeeth,
	onToggleTooth,
	onSelectAnterior,
	onClearTeeth,
}) => {
	return (
		<div
			data-testid="ortho-dental-arch-section"
			className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/50 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800"
		>
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
					<BracesBracket size={14} />
					Зубная формула (активация)
				</span>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => onSelectArch("upper")}
						className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
							targetArch === "upper"
								? "bg-blue-500 text-white border-blue-600"
								: "bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700"
						}`}
					>
						Вся ВЧ
					</button>
					<button
						type="button"
						onClick={() => onSelectArch("lower")}
						className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
							targetArch === "lower"
								? "bg-blue-500 text-white border-blue-600"
								: "bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700"
						}`}
					>
						Вся НЧ
					</button>
					<button
						type="button"
						onClick={() => onSelectArch("both")}
						className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
							targetArch === "both"
								? "bg-blue-500 text-white border-blue-600"
								: "bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700"
						}`}
					>
						Обе челюсти
					</button>
					<button
						type="button"
						onClick={onSelectAnterior}
						className="px-2 py-1 text-[11px] font-bold rounded-md border bg-white dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
					>
						Фронт
					</button>
					<button
						type="button"
						onClick={onClearTeeth}
						className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
						title="Сбросить выбор"
					>
						<RotateCcw size={14} />
					</button>
				</div>
			</div>

			{/* FDI Formula Buttons */}
			<div className="flex flex-col gap-1">
				{/* Upper Arch (18-11 | 21-28) */}
				<div className="flex items-center justify-center gap-0.5 overflow-x-auto py-1">
					{UPPER_TEETH.map((tooth, idx) => {
						const isSelected = selectedTeeth.includes(tooth);
						const isMidline = idx === 7;
						return (
							<React.Fragment key={tooth}>
								<button
									type="button"
									onClick={() => onToggleTooth(tooth)}
									className={`min-w-[40px] min-h-[40px] p-1 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
										isSelected
											? "bg-blue-600 text-white shadow-xs font-black"
											: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
									}`}
									title={`Зуб ${tooth}`}
								>
									{tooth}
								</button>
								{isMidline && <div className="w-1.5 h-7 bg-slate-300 dark:bg-slate-700 mx-0.5" />}
							</React.Fragment>
						);
					})}
				</div>

				{/* Lower Arch (48-41 | 31-38) */}
				<div className="flex items-center justify-center gap-0.5 overflow-x-auto py-1">
					{LOWER_TEETH.map((tooth, idx) => {
						const isSelected = selectedTeeth.includes(tooth);
						const isMidline = idx === 7;
						return (
							<React.Fragment key={tooth}>
								<button
									type="button"
									onClick={() => onToggleTooth(tooth)}
									className={`min-w-[40px] min-h-[40px] p-1 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
										isSelected
											? "bg-blue-600 text-white shadow-xs font-black"
											: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
									}`}
									title={`Зуб ${tooth}`}
								>
									{tooth}
								</button>
								{isMidline && <div className="w-1.5 h-7 bg-slate-300 dark:bg-slate-700 mx-0.5" />}
							</React.Fragment>
						);
					})}
				</div>
			</div>
		</div>
	);
};
