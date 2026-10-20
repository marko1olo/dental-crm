import type React from "react";
import { useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import type { PerioPathologyPreset } from "../../../../lib/clinicalProtocols043";
import { VisitDiaryPerioPediatricPresets } from "../VisitDiaryPerioPediatricPresets";

export interface VisitDiaryPresetsAccordionProps {
	readonly fieldsDisabled: boolean;
	readonly activeTeeth?: readonly any[];
	readonly onPopulateFromOdontogram: (teeth: readonly any[]) => void;
	readonly onApplyNorm: () => void;
	readonly handleInsertPerioStatus: () => void;
	readonly handleApplyPerioPathology: (preset: PerioPathologyPreset) => void;
	readonly handleInsertPediatricStatus: () => void;
	readonly applyClinicalPreset: (id: string, options?: any) => any;
	readonly onOpenTemplatesModal: () => void;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly setDiary: React.Dispatch<React.SetStateAction<any>>;
	readonly setIcdSearch: (val: string) => void;
	readonly scheduleDebouncedSave: () => void;
}

export const VisitDiaryPresetsAccordion: React.FC<VisitDiaryPresetsAccordionProps> = ({
	fieldsDisabled,
	activeTeeth,
	onPopulateFromOdontogram,
	onApplyNorm,
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
}) => {
	const [showPerioPathologyMenu, setShowPerioPathologyMenu] = useState(false);
	const perioMenuRef = useRef<HTMLDivElement>(null);

	if (fieldsDisabled) return null;

	return (
		<details
			className="group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-xs"
			data-testid="fast-clinical-presets-bar"
		>
			<summary className="cursor-pointer font-bold text-xs text-[var(--ink)] hover:text-[var(--teal)] flex items-center justify-between select-none list-none">
				<span className="flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Клинические протоколы и формулы (PSR, Дети, Кариес...)</span>
				</span>
				<span className="text-[11px] font-medium text-[var(--muted)] group-open:hidden">
					Развернуть &darr;
				</span>
				<span className="text-[11px] font-medium text-[var(--muted)] hidden group-open:inline">
					Свернуть &uarr;
				</span>
			</summary>
			<div className="pt-2.5 flex flex-col gap-2">
				{activeTeeth && activeTeeth.length > 0 && (
					<div className="flex items-center justify-end gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => onPopulateFromOdontogram(activeTeeth)}
							className="vde-043__btn vde-043__btn--norm border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors"
							title="Сформировать структурированный дневник из отметок на зубной формуле"
							data-testid="populate-diary-from-odontogram-btn"
						>
							<FileText size={14} className="shrink-0 text-[var(--teal)]" />
							<span>Заполнить дневник из формулы</span>
						</button>
					</div>
				)}
				<div className="flex flex-col gap-2 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => {
								if (isLocked && !isRevising) beginRevise();
								onApplyNorm();
							}}
							className="border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-bold rounded-lg px-2.5 py-1.5 shadow-2xs transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
							data-testid="diary-norm-043-btn"
							title="Заполнить дневник физиологической нормой: соматически здоров, интактные зубы"
						>
							<Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>✓ Физиологическая норма (соматически здоров)</span>
						</button>
					</div>

					<VisitDiaryPerioPediatricPresets
						perioMenuRef={perioMenuRef}
						showPerioPathologyMenu={showPerioPathologyMenu}
						setShowPerioPathologyMenu={setShowPerioPathologyMenu}
						handleInsertPerioStatus={handleInsertPerioStatus}
						handleApplyPerioPathology={handleApplyPerioPathology}
						handleInsertPediatricStatus={handleInsertPediatricStatus}
						applyClinicalPreset={applyClinicalPreset}
						onOpenTemplatesModal={onOpenTemplatesModal}
						isLocked={isLocked}
						isRevising={isRevising}
						beginRevise={beginRevise}
						setDiary={setDiary}
						setIcdSearch={setIcdSearch}
						scheduleDebouncedSave={scheduleDebouncedSave}
					/>
				</div>
			</div>
		</details>
	);
};
