import React from "react";
import type { TargetArch } from "./orthoProtocolTypes";
import { ArchQuickSelectorBar } from "./dentalArch/ArchQuickSelectorBar";
import { ArchTeethGrid } from "./dentalArch/ArchTeethGrid";

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
			<ArchQuickSelectorBar
				targetArch={targetArch}
				onSelectArch={onSelectArch}
				onSelectAnterior={onSelectAnterior}
				onClearTeeth={onClearTeeth}
			/>

			<ArchTeethGrid
				selectedTeeth={selectedTeeth}
				onToggleTooth={onToggleTooth}
			/>
		</div>
	);
};
