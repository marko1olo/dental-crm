import React from "react";
import { useVisitStore } from "../../../store/visitStore";
import type { EmkToolbarProps } from "./emkToolbarModules/emkToolbarTypes";
import { EmkQuickActionButtons } from "./emkToolbarModules/EmkQuickActionButtons";
import { EmkStepperControls } from "./emkToolbarModules/EmkStepperControls";
import { useEmkToolbarKeyboardShortcuts } from "./emkToolbarModules/useEmkToolbarKeyboardShortcuts";

export type { EmkToolbarProps } from "./emkToolbarModules/emkToolbarTypes";
export * from "./emkToolbarModules/emkToolbarTypes";

/**
 * Единая панель инструментов ЭМК приёма (EmkToolbar):
 * - Единая кнопка физиологической нормы (`data-testid="btn-chairside-physiological-norm"`, "✓ Соматически здоров / Норма", иконка ShieldCheck)
 * - Бейдж автосохранения (`data-testid="emk-autosave-status-badge"`) в EmkScheduleAndAutosaveBadges
 * - Портальные меню (без clipping) и личные макросы врача
 */

export function EmkToolbar({
	activeEmkTab: propActiveEmkTab,
	setActiveEmkTab: propSetActiveEmkTab,
	onTabChange,
	onApplyPhysiologicalNorm,
	onApplyNorm,
	onApplyOrthoNorm,
	onApplySurgeryNorm,
	onApplySoapPreset,
	updateVisitNoteField,
	onToggleStarProtocols: propOnToggleStarProtocols,
	onOpenStarProtocols,
	onOpenProtocolsCatalog: propOnOpenProtocolsCatalog,
	onOpenSoapTemplates,
	onToggleCopilot = () => {},
	isCopilotOpen = false,
	onScheduleNextVisit = () => {},
	onScheduleNext,
	onOpenConsent: propOnOpenConsent,
	onOpenConsentModal,
	onPrintMedicalCard: propOnPrintMedicalCard,
	onOpenPrintModal,
	hasUnsavedChanges = false,
	voicePilotNode,
	specialtyFocusNode,
	recentVisitActionNode,
	followupScheduleNode,
	onUndo,
	onRedo,
}: EmkToolbarProps) {
	const onPrintMedicalCard = propOnPrintMedicalCard ?? onOpenPrintModal;
	const onOpenConsent = propOnOpenConsent ?? onOpenConsentModal;
	const onOpenProtocolsCatalog = propOnOpenProtocolsCatalog ?? onOpenSoapTemplates;
	const onToggleStarProtocols = propOnToggleStarProtocols ?? onOpenStarProtocols;

	const storeUndoVisit = useVisitStore((s) => s.undoVisit);
	const storeRedoVisit = useVisitStore((s) => s.redoVisit);
	const storeCanUndo = useVisitStore((s) => s.canUndo);
	const storeCanRedo = useVisitStore((s) => s.canRedo);

	const handleUndo = onUndo ?? storeUndoVisit;
	const handleRedo = onRedo ?? storeRedoVisit;
	const canUndo = storeCanUndo;
	const canRedo = storeCanRedo;

	const [localActiveTab, setLocalActiveTab] = React.useState<string>("all");
	const activeEmkTab = propActiveEmkTab ?? localActiveTab;
	const setActiveEmkTab = propSetActiveEmkTab ?? setLocalActiveTab;
	const handleSchedule = onScheduleNext || (() => onScheduleNextVisit(5));

	useEmkToolbarKeyboardShortcuts(canUndo, canRedo, handleUndo, handleRedo);

	return (
		<div
			className="emk-unified-toolbar flex flex-col w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--paper)] shadow-2xs"
			data-testid="emk-unified-toolbar"
		>
			<EmkQuickActionButtons
				onApplyPhysiologicalNorm={onApplyPhysiologicalNorm}
				onApplyNorm={onApplyNorm}
				onApplyOrthoNorm={onApplyOrthoNorm}
				onApplySurgeryNorm={onApplySurgeryNorm}
				onApplySoapPreset={onApplySoapPreset}
				updateVisitNoteField={updateVisitNoteField}
				onOpenProtocolsCatalog={onOpenProtocolsCatalog}
				onToggleStarProtocols={onToggleStarProtocols}
				onOpenConsent={onOpenConsent}
				onPrintMedicalCard={onPrintMedicalCard}
				onToggleCopilot={onToggleCopilot}
				isCopilotOpen={isCopilotOpen}
				handleSchedule={handleSchedule}
				hasUnsavedChanges={hasUnsavedChanges}
				voicePilotNode={voicePilotNode}
				specialtyFocusNode={specialtyFocusNode}
				recentVisitActionNode={recentVisitActionNode}
				followupScheduleNode={followupScheduleNode}
				canUndo={canUndo}
				canRedo={canRedo}
				handleUndo={handleUndo}
				handleRedo={handleRedo}
			/>

			<EmkStepperControls
				activeEmkTab={activeEmkTab}
				setActiveEmkTab={setActiveEmkTab}
				onTabChange={onTabChange}
			/>
		</div>
	);
}
