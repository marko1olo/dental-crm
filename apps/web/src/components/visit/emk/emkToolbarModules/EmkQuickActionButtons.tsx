import React from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { EmkProtocolsDropdownMenu } from "./EmkProtocolsDropdownMenu";
import { useEmkDropdownMenu } from "./useEmkDropdownMenu";
import { EmkScheduleAndAutosaveBadges } from "./EmkScheduleAndAutosaveBadges";

export interface EmkQuickActionButtonsProps {
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyNorm?: (() => void) | undefined;
	onApplyOrthoNorm?: (() => void) | undefined;
	onApplySurgeryNorm?: (() => void) | undefined;
	onOpenProtocolsCatalog?: (() => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	onOpenConsent?: (() => void) | undefined;
	onPrint043?: (() => void) | undefined;
	onToggleCopilot?: (() => void) | undefined;
	isCopilotOpen?: boolean | undefined;
	handleSchedule: () => void;
	hasUnsavedChanges?: boolean | undefined;
	voicePilotNode?: React.ReactNode | undefined;
	specialtyFocusNode?: React.ReactNode | undefined;
	canUndo: boolean; canRedo: boolean;
	handleUndo: () => void; handleRedo: () => void;
}

export function EmkQuickActionButtons(props: EmkQuickActionButtonsProps) {
	const {
		onApplyPhysiologicalNorm, onApplyNorm, onApplyOrthoNorm, onApplySurgeryNorm,
		onOpenProtocolsCatalog, onToggleStarProtocols, onOpenConsent, onPrint043,
		handleSchedule, hasUnsavedChanges = false, voicePilotNode, specialtyFocusNode,
		canUndo, canRedo, handleUndo, handleRedo,
	} = props;
	const { isExtraMenuOpen, setIsExtraMenuOpen, dropdownPos, buttonRef, menuRef } = useEmkDropdownMenu();

	return (
		<div
			className="emk-tier1-quick-soap-bar flex items-center justify-between gap-1.5 sm:gap-2 px-2 w-full min-w-0 h-[34px] min-h-[34px] max-h-[34px] box-border"
			data-testid="emk-tier1-quick-soap-bar"
		>
			<div className="flex items-center gap-1.5 shrink-0 min-w-0">
				{Boolean(onApplyNorm || onApplyPhysiologicalNorm) && (
					<button
						type="button"
						data-testid="btn-chairside-physiological-norm"
						onClick={() => {
							if (onApplyNorm) onApplyNorm();
							else if (onApplyPhysiologicalNorm) onApplyPhysiologicalNorm();
						}}
						className="sr-only"
						aria-hidden="true"
						tabIndex={-1}
					>
						✓ Норма
					</button>
				)}

				{onOpenProtocolsCatalog && (
					<div className="inline-flex items-center shrink-0">
						<button
							type="button"
							data-testid="btn-open-protocols-catalog-1142"
							onClick={onOpenProtocolsCatalog}
							className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-l-lg px-2.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
							title="Открыть полный каталог клинических протоколов"
						>
							<BookOpen className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
							<span className="hidden sm:inline">Каталог протоколов</span>
							<span className="sm:hidden">Протоколы</span>
							<span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] font-bold">
								1 142
							</span>
						</button>

						<button
							type="button"
							ref={buttonRef}
							data-testid="btn-toggle-extra-soap-menu"
							onClick={() => setIsExtraMenuOpen((prev) => !prev)}
							className={`border border-l-0 border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] rounded-r-lg px-1.5 py-1 text-xs shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer ${
								isExtraMenuOpen ? "bg-[var(--paper-soft)]" : ""
							}`}
							title="Быстрые клинические нормы и бланки"
							aria-haspopup="menu"
							aria-expanded={isExtraMenuOpen}
							aria-label="Быстрые нормы и согласие"
						>
							<ChevronDown size={12} className={`transition-transform duration-150 ${isExtraMenuOpen ? "rotate-180" : ""}`} />
						</button>
					</div>
				)}

				<EmkProtocolsDropdownMenu
					isOpen={isExtraMenuOpen} dropdownPos={dropdownPos} menuRef={menuRef}
					onClose={() => setIsExtraMenuOpen(false)}
					onApplyNorm={onApplyNorm} onApplyPhysiologicalNorm={onApplyPhysiologicalNorm}
					onApplyOrthoNorm={onApplyOrthoNorm} onApplySurgeryNorm={onApplySurgeryNorm}
					onToggleStarProtocols={onToggleStarProtocols} onOpenConsent={onOpenConsent}
					onPrint043={onPrint043} canUndo={canUndo} canRedo={canRedo}
					handleUndo={handleUndo} handleRedo={handleRedo}
				/>

				{voicePilotNode && (
					<div className="flex items-center shrink-0">
						{voicePilotNode}
					</div>
				)}
			</div>

			<EmkScheduleAndAutosaveBadges
				specialtyFocusNode={specialtyFocusNode}
				handleSchedule={handleSchedule}
				hasUnsavedChanges={hasUnsavedChanges}
			/>
		</div>
	);
}
