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
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)]"
		>
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<BracesBracket size={14} className="text-[var(--primary)]" />
					Зубная формула (активация)
				</span>
				<div className="flex items-center gap-1 flex-wrap">
					<button
						type="button"
						onClick={() => onSelectArch("upper")}
						className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
							targetArch === "upper"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Вся ВЧ
					</button>
					<button
						type="button"
						onClick={() => onSelectArch("lower")}
						className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
							targetArch === "lower"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Вся НЧ
					</button>
					<button
						type="button"
						onClick={() => onSelectArch("both")}
						className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
							targetArch === "both"
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						Обе челюсти
					</button>
					<button
						type="button"
						onClick={onSelectAnterior}
						className="px-2.5 py-1 text-[11px] font-bold rounded-xl border bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer"
					>
						Фронт
					</button>
					<button
						type="button"
						onClick={onClearTeeth}
						className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
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
									className={`min-w-[40px] min-h-[40px] p-1 text-xs font-bold rounded-xl flex items-center justify-center transition-all cursor-pointer ${
										isSelected
											? "bg-[var(--primary)] text-white shadow-xs font-black border border-[var(--primary)]"
											: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong,var(--primary))]"
									}`}
									title={`Зуб ${tooth}`}
								>
									{tooth}
								</button>
								{isMidline && <div className="w-1.5 h-8 bg-[var(--line)] mx-0.5 rounded-full" />}
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
									className={`min-w-[40px] min-h-[40px] p-1 text-xs font-bold rounded-xl flex items-center justify-center transition-all cursor-pointer ${
										isSelected
											? "bg-[var(--primary)] text-white shadow-xs font-black border border-[var(--primary)]"
											: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong,var(--primary))]"
									}`}
									title={`Зуб ${tooth}`}
								>
									{tooth}
								</button>
								{isMidline && <div className="w-1.5 h-8 bg-[var(--line)] mx-0.5 rounded-full" />}
							</React.Fragment>
						);
					})}
				</div>
			</div>
		</div>
	);
};
