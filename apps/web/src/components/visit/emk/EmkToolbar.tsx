import React from "react";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import type { EmkToolbarProps } from "./emkToolbarModules/emkToolbarTypes";
import { EmkQuickActionButtons } from "./emkToolbarModules/EmkQuickActionButtons";
import { EmkStepperControls } from "./emkToolbarModules/EmkStepperControls";

export type { EmkToolbarProps } from "./emkToolbarModules/emkToolbarTypes";
export * from "./emkToolbarModules/emkToolbarTypes";

export function EmkToolbar({
	activeEmkTab: propActiveEmkTab,
	setActiveEmkTab: propSetActiveEmkTab,
	onTabChange,
	onApplyPhysiologicalNorm,
	onApplyNorm,
	onApplyOrthoNorm,
	onApplySurgeryNorm,
	onToggleStarProtocols = () => {},
	onOpenProtocolsCatalog,
	onToggleCopilot = () => {},
	isCopilotOpen = false,
	onScheduleNextVisit = () => {},
	onScheduleNext,
	onOpenConsent,
	onPrint043,
	hasUnsavedChanges = false,
	voicePilotNode,
	specialtyFocusNode,
	noteForm = {},
	onUndo,
	onRedo,
}: EmkToolbarProps) {
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

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			const isTextInput =
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable);

			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "z" || e.key === "Z" || e.key === "я" || e.key === "Я")
			) {
				if (e.shiftKey) {
					if (!isTextInput && canRedo) {
						e.preventDefault();
						const ok = handleRedo();
						if (ok) showToast("Действие возвращено (Redo)", "info", 2000);
					}
				} else {
					if (!isTextInput && canUndo) {
						e.preventDefault();
						const ok = handleUndo();
						if (ok) showToast("Действие отменено (Undo)", "info", 2000);
					}
				}
			} else if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "y" || e.key === "Y" || e.key === "н" || e.key === "Н")
			) {
				if (!isTextInput && canRedo) {
					e.preventDefault();
					const ok = handleRedo();
					if (ok) showToast("Действие возвращено (Redo)", "info", 2000);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, handleUndo, handleRedo]);

	return (
		<div
			className="emk-unified-toolbar flex flex-col w-full min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] shadow-xs mb-1.5 overflow-hidden"
			data-testid="emk-unified-toolbar"
		>
			{/* СТРОКА 1: Клинические инструменты приёма (Action Toolbar) */}
			<EmkQuickActionButtons
				onApplyPhysiologicalNorm={onApplyPhysiologicalNorm}
				onApplyNorm={onApplyNorm}
				onApplyOrthoNorm={onApplyOrthoNorm}
				onApplySurgeryNorm={onApplySurgeryNorm}
				onOpenProtocolsCatalog={onOpenProtocolsCatalog}
				onToggleStarProtocols={onToggleStarProtocols}
				onOpenConsent={onOpenConsent}
				onPrint043={onPrint043}
				onToggleCopilot={onToggleCopilot}
				isCopilotOpen={isCopilotOpen}
				handleSchedule={handleSchedule}
				hasUnsavedChanges={hasUnsavedChanges}
				voicePilotNode={voicePilotNode}
				specialtyFocusNode={specialtyFocusNode}
				canUndo={canUndo}
				canRedo={canRedo}
				handleUndo={handleUndo}
				handleRedo={handleRedo}
			/>

			{/* СТРОКА 2: Навигационный сегментированный таб-бар ЭМК — мобильный Apple HIG */}
			<EmkStepperControls
				activeEmkTab={activeEmkTab}
				setActiveEmkTab={setActiveEmkTab}
				noteForm={noteForm}
			/>
		</div>
	);
}
