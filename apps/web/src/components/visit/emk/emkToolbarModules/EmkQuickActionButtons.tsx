import React from "react";
import { BookOpen, ChevronDown, Pill, ShieldCheck } from "lucide-react";
import type { ClinicalSoapPreset } from "../../clinicalSoapTypes";
import { emitClinicEvent } from "../../../../lib/clinicEventBus";
import { EmkProtocolsDropdownMenu } from "./EmkProtocolsDropdownMenu";
import { EmkScheduleAndAutosaveBadges } from "./EmkScheduleAndAutosaveBadges";
import { useEmkDropdownMenu } from "./useEmkDropdownMenu";

export interface EmkQuickActionButtonsProps {
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyNorm?: (() => void) | undefined;
	onApplyOrthoNorm?: (() => void) | undefined;
	onApplySurgeryNorm?: (() => void) | undefined;
	onApplySoapPreset?: ((preset: ClinicalSoapPreset) => void) | undefined;
	updateVisitNoteField?: ((field: string, value: string) => void) | undefined;
	onOpenProtocolsCatalog?: (() => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	onOpenConsent?: (() => void) | undefined;
	onPrintMedicalCard?: (() => void) | undefined;
	onToggleCopilot?: (() => void) | undefined;
	isCopilotOpen?: boolean | undefined;
	handleSchedule: () => void;
	hasUnsavedChanges?: boolean | undefined;
	voicePilotNode?: React.ReactNode | undefined;
	specialtyFocusNode?: React.ReactNode | undefined;
	recentVisitActionNode?: React.ReactNode | undefined;
	followupScheduleNode?: React.ReactNode | undefined;
	canUndo: boolean;
	canRedo: boolean;
	handleUndo: () => boolean | void;
	handleRedo: () => boolean | void;
}

export function EmkQuickActionButtons(props: EmkQuickActionButtonsProps) {
	const {
		onApplyPhysiologicalNorm,
		onApplyNorm,
		onApplySoapPreset,
		updateVisitNoteField,
		onOpenProtocolsCatalog,
		onToggleStarProtocols,
		onOpenConsent,
		onPrintMedicalCard,
		handleSchedule,
		hasUnsavedChanges,
		voicePilotNode,
		specialtyFocusNode,
		recentVisitActionNode,
		followupScheduleNode,
		canUndo,
		canRedo,
		handleUndo,
		handleRedo,
	} = props;
	const { isExtraMenuOpen, setIsExtraMenuOpen, dropdownPos, buttonRef, menuRef } = useEmkDropdownMenu();

	return (
		<div
			className="emk-tier1-quick-soap-bar flex items-center justify-between gap-1.5 sm:gap-2 px-2 w-full min-w-0 h-[36px] min-h-[36px] max-h-[36px] box-border"
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
						className="secondary-button border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium text-xs h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
						title="Заполнить дневник физиологической нормой («Соматически здоров»)"
					>
						<ShieldCheck className="w-3.5 h-3.5 text-[var(--success-ink,var(--primary))] shrink-0" />
						<span className="hidden sm:inline">Соматически здоров / Норма</span>
						<span className="sm:hidden">Норма</span>
					</button>
				)}

				<button
					type="button"
					data-testid="btn-chairside-prescriptions-toolbar"
					onClick={() => emitClinicEvent("studio:open", { studio: { kind: "prescriptions" } })}
					className="secondary-button border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium text-xs h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
					title="Выписать рецепты и назначения на лекарства"
				>
					<Pill className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
					<span className="hidden md:inline">Рецепты</span>
					<span className="md:hidden">Рецепты</span>
				</button>

				<div className="inline-flex items-center shrink-0">
					{onOpenProtocolsCatalog && (
						<button
							type="button"
							data-testid="btn-open-protocols-catalog-1142"
							onClick={onOpenProtocolsCatalog}
							className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium rounded-l-md h-8 px-2.5 text-xs hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
							title="Открыть каталог клинических протоколов"
						>
							<BookOpen className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
							<span className="hidden sm:inline">Протоколы</span>
							<span className="sm:hidden">Протоколы</span>
						</button>
					)}

					<button
						type="button"
						ref={buttonRef}
						data-testid="btn-toggle-extra-soap-menu"
						onClick={() => setIsExtraMenuOpen((prev) => !prev)}
						className={`border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] h-8 px-2 text-xs inline-flex items-center gap-1 transition-colors cursor-pointer ${
							onOpenProtocolsCatalog ? "border-l-0 rounded-r-md" : "rounded-md"
						} ${isExtraMenuOpen ? "bg-[var(--paper-soft)]" : ""}`}
						title="Личные макросы, клинические модули и печать карты"
						aria-haspopup="menu"
						aria-expanded={isExtraMenuOpen}
						aria-label="Макросы и разделы приёма"
					>
						{!onOpenProtocolsCatalog && <span>Макросы</span>}
						<ChevronDown
							className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isExtraMenuOpen ? "rotate-180" : ""}`}
						/>
					</button>
				</div>

				<EmkProtocolsDropdownMenu
					isOpen={isExtraMenuOpen}
					dropdownPos={dropdownPos ?? { top: 0, left: 0 }}
					menuRef={menuRef}
					onClose={() => setIsExtraMenuOpen(false)}
					onApplySoapPreset={onApplySoapPreset}
					updateVisitNoteField={updateVisitNoteField}
					onToggleStarProtocols={onToggleStarProtocols}
					onOpenConsent={onOpenConsent}
					onPrintMedicalCard={onPrintMedicalCard}
					canUndo={canUndo}
					canRedo={canRedo}
					handleUndo={handleUndo}
					handleRedo={handleRedo}
				/>

				{voicePilotNode && <div className="flex items-center shrink-0">{voicePilotNode}</div>}
				{recentVisitActionNode}
			</div>

			<EmkScheduleAndAutosaveBadges
				specialtyFocusNode={specialtyFocusNode}
				followupScheduleNode={followupScheduleNode}
				handleSchedule={handleSchedule}
				hasUnsavedChanges={hasUnsavedChanges}
			/>
		</div>
	);
}
