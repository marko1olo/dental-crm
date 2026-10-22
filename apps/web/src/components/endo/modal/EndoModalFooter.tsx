import React from "react";
import { Printer } from "lucide-react";
import type { EndoStageStamp } from "../endoCanalConstants";
import { EndoFooterActionsMenu } from "./EndoFooterActionsMenu";
import { EndoFooterPrimaryButtons } from "./EndoFooterPrimaryButtons";

interface EndoModalFooterProps {
	readonly stageStamp: EndoStageStamp;
	readonly setStageStamp: (stamp: EndoStageStamp) => void;
	readonly isSaving: boolean;
	readonly isFooterMenuOpen: boolean;
	readonly setIsFooterMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onPrintWorksheet: () => void;
	readonly onSaveCanalsOnly: () => void;
	readonly onCopyText: () => void;
	readonly onResetToDefaults: () => void;
	readonly onCopyPatientMemo: () => void;
	readonly onInsertToProtocol: () => void;
	readonly onClose: () => void;
}

export const EndoModalFooter: React.FC<EndoModalFooterProps> = ({
	stageStamp,
	setStageStamp,
	isSaving,
	isFooterMenuOpen,
	setIsFooterMenuOpen,
	onPrintWorksheet,
	onSaveCanalsOnly,
	onCopyText,
	onResetToDefaults,
	onCopyPatientMemo,
	onInsertToProtocol,
	onClose,
}) => (
	<footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
		<div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
			<button
				type="button"
				onClick={onPrintWorksheet}
				data-testid="endo-print-worksheet-btn"
				className="secondary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer min-h-[50px]"
				title="Распечатать эндодонтическую карту (А4) для истории болезни"
			>
				<Printer size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
				<span>
					<span className="hidden sm:inline">Печать эндо-карты (А4)</span>
					<span className="sm:hidden">Печать А4</span>
				</span>
			</button>

			<EndoFooterActionsMenu
				isOpen={isFooterMenuOpen}
				setIsOpen={setIsFooterMenuOpen}
				onSaveCanalsOnly={onSaveCanalsOnly}
				onCopyText={onCopyText}
				onResetToDefaults={onResetToDefaults}
			/>

			<div className="flex items-center gap-1.5">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
					Штамп:
				</span>
				<select
					value={stageStamp}
					onChange={(e) => setStageStamp(e.target.value as EndoStageStamp)}
					aria-label="Клинический штамп этапа лечения"
					className="h-10 sm:h-9 px-2 rounded-xl text-xs font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#cbd5e1)] dark:border-slate-700 outline-none cursor-pointer"
				>
					<option value="COMPLETED">ОБТУРИРОВАНО</option>
					<option value="TEMP_CAOH2">ВРЕМЕННАЯ ОБТУРАЦИЯ</option>
					<option value="DRAFT">ЧЕРНОВИК</option>
				</select>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="secondary-button h-10 sm:h-9 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
			>
				Отмена
			</button>
		</div>

		<EndoFooterPrimaryButtons
			isSaving={isSaving}
			onCopyPatientMemo={onCopyPatientMemo}
			onInsertToProtocol={onInsertToProtocol}
		/>
	</footer>
);
