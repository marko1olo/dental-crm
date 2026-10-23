/**
 * DENTE Dental CRM — 32-Tooth Gate 0 Full Arch Odontogram Mockup
 * Experimental clinical tooth 46 multiplication & badge size laboratory (Mandate 8b <= 120 lines).
 */

import React, { useState } from "react";
import { ArchMacroComparison } from "./ArchMacroComparison";
import { ArchMockupRow } from "./ArchMockupRow";
import { ArchMockupToolbar } from "./ArchMockupToolbar";
import { ArchToothDetailModal } from "./ArchToothDetailModal";
import {
	createMockupTeeth,
	DEFAULT_32_ASSIGNMENTS,
	resetToIntactAssignments,
	shuffle32Assignments,
} from "./archMockupPresets";
import type {
	BadgePlacement,
	BadgeSizeOption,
	MockupToothItem,
} from "./archMockupTypes";

export interface Tooth46FullArchMockupProps {
	readonly isDark?: boolean;
	readonly initialSize?: BadgeSizeOption;
}

export const Tooth46FullArchMockup: React.FC<Tooth46FullArchMockupProps> = ({
	isDark = false,
	initialSize = "xxl",
}) => {
	const [sizeOption, setSizeOption] = useState<BadgeSizeOption>(initialSize);
	const [placement, setPlacement] = useState<BadgePlacement>("root_apex");
	const [assignments, setAssignments] = useState<Record<number, string>>(DEFAULT_32_ASSIGNMENTS);
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
	const [modalItem, setModalItem] = useState<MockupToothItem | null>(null);
	const [showMacro, setShowMacro] = useState<boolean>(true);

	const allTeeth = createMockupTeeth(assignments);
	const upperTeeth = allTeeth.filter((t) => t.isUpper);
	const lowerTeeth = allTeeth.filter((t) => !t.isUpper);

	const handleSelectTooth = (item: MockupToothItem) => {
		setSelectedTooth(item.toothNumber);
		setModalItem(item);
	};

	const handleApplyPreset = (toothNumber: number, presetId: string) => {
		setAssignments((prev) => ({ ...prev, [toothNumber]: presetId }));
		setModalItem((prev) => (prev ? { ...prev, presetId } : null));
	};

	return (
		<div data-testid="tooth46-full-arch-mockup" className="w-full flex flex-col items-center gap-4 py-2">
			<ArchMockupToolbar
				sizeOption={sizeOption}
				onSelectSize={setSizeOption}
				placement={placement}
				onTogglePlacement={() => setPlacement((p) => (p === "root_apex" ? "occlusal" : "root_apex"))}
				onShuffle={() => setAssignments(shuffle32Assignments())}
				onResetIntact={() => setAssignments(resetToIntactAssignments())}
				showMacro={showMacro}
				onToggleMacro={() => setShowMacro((m) => !m)}
			/>

			{/* 32-Tooth Full Arch Container */}
			<div className="w-full max-w-6xl overflow-x-auto rounded-3xl border border-current/10 p-2 sm:p-5 flex flex-col items-center gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
				<ArchMockupRow
					archTitle="Верхняя челюсть (Maxilla) · 18–11 | 21–28"
					teeth={upperTeeth}
					sizeOption={sizeOption}
					isDark={isDark}
					placement={placement}
					selectedTooth={selectedTooth}
					onSelectTooth={handleSelectTooth}
				/>

				{/* Occlusal Plane Separator */}
				<div className="w-full max-w-4xl flex items-center gap-3 my-1 opacity-50">
					<div className="flex-1 h-px bg-gradient-to-r from-transparent via-current to-transparent" />
					<span className="text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border border-current/20">
						Окклюзионная плоскость смыкания
					</span>
					<div className="flex-1 h-px bg-gradient-to-r from-transparent via-current to-transparent" />
				</div>

				<ArchMockupRow
					archTitle="Нижняя челюсть (Mandible) · 48–41 | 31–38"
					teeth={lowerTeeth}
					sizeOption={sizeOption}
					isDark={isDark}
					placement={placement}
					selectedTooth={selectedTooth}
					onSelectTooth={handleSelectTooth}
				/>
			</div>

			{/* Macro Zoom Inspection Section */}
			{showMacro && (
				<ArchMacroComparison
					isDark={isDark}
					activeSize={sizeOption}
					onSelectSize={(s) => setSizeOption(s)}
				/>
			)}

			{/* Tooth Details Popover */}
			<ArchToothDetailModal
				item={modalItem}
				onClose={() => setModalItem(null)}
				onApplyPreset={handleApplyPreset}
			/>
		</div>
	);
};
