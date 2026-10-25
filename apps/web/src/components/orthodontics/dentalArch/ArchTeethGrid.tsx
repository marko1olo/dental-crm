import React from "react";
import { UPPER_TEETH, LOWER_TEETH } from "../orthoProtocolTypes";

export interface ArchTeethGridProps {
	readonly selectedTeeth: number[];
	readonly onToggleTooth: (tooth: number) => void;
}

function renderRow(teeth: number[], selectedTeeth: number[], onToggleTooth: (t: number) => void) {
	return (
		<div className="flex items-center justify-center gap-0.5 overflow-x-auto py-1">
			{teeth.map((tooth, idx) => {
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
	);
}

export const ArchTeethGrid: React.FC<ArchTeethGridProps> = ({
	selectedTeeth,
	onToggleTooth,
}) => {
	return (
		<div className="flex flex-col gap-1">
			{renderRow(UPPER_TEETH, selectedTeeth, onToggleTooth)}
			{renderRow(LOWER_TEETH, selectedTeeth, onToggleTooth)}
		</div>
	);
};
