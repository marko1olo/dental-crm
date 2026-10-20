import React from "react";
import { Sparkles } from "lucide-react";
import type { PerioPathologyPreset } from "../../../lib/clinicalProtocols043";
import { ClinicalQuickPresetsBar } from "../ClinicalQuickPresetsBar";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { PerioPillWithDropdown } from "./section/PerioPillWithDropdown";

export interface VisitDiaryPerioPediatricPresetsProps {
	readonly perioMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly showPerioPathologyMenu: boolean;
	readonly setShowPerioPathologyMenu: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleInsertPerioStatus: () => void;
	readonly handleApplyPerioPathology: (preset: PerioPathologyPreset) => void;
	readonly handleInsertPediatricStatus: () => void;
	readonly applyClinicalPreset: (preset: any, targetTooth?: number | null | undefined) => void;
	readonly onOpenTemplatesModal: () => void;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly setIcdSearch: (val: string) => void;
	readonly scheduleDebouncedSave: () => void;
}

export function VisitDiaryPerioPediatricPresets(props: VisitDiaryPerioPediatricPresetsProps) {
	const {
		perioMenuRef,
		showPerioPathologyMenu,
		setShowPerioPathologyMenu,
		handleInsertPerioStatus,
		handleApplyPerioPathology,
		handleInsertPediatricStatus,
		applyClinicalPreset,
		onOpenTemplatesModal,
		isLocked,
		isRevising,
		beginRevise,
		setDiary,
		setIcdSearch,
		scheduleDebouncedSave,
	} = props;

	return (
		<div className="flex flex-col gap-2 min-w-0">
			<div className="dente-filter-chips">
				<PerioPillWithDropdown
					perioMenuRef={perioMenuRef}
					showPerioPathologyMenu={showPerioPathologyMenu}
					setShowPerioPathologyMenu={setShowPerioPathologyMenu}
					handleInsertPerioStatus={handleInsertPerioStatus}
					handleApplyPerioPathology={handleApplyPerioPathology}
				/>

				<button
					type="button"
					onClick={handleInsertPediatricStatus}
					className="dente-filter-chip border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
					title="Вставить протокол сменного прикуса, физиологической резорбции корней и Кариограммы Bratthall"
					data-testid="insert-pediatric-cariogram-btn"
				>
					<span className="font-mono text-[10px] font-bold text-[var(--teal)]">
						ДЕТИ
					</span>
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="whitespace-nowrap shrink-0">Сменный прикус (резорбция + кариограмма)</span>
				</button>

				<ClinicalQuickPresetsBar
					onSelectPreset={applyClinicalPreset}
					onOpenTemplatesModal={onOpenTemplatesModal}
					isLocked={isLocked}
				/>
			</div>
		</div>
	);
}
