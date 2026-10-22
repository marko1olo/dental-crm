import React from "react";
import { createPortal } from "react-dom";
import type { EndoCanalData, EndoToothClinicalData } from "@dental/shared";
import { useEndoCanalLogic } from "./useEndoCanalLogic";
import { EndoModalHeader } from "./modal/EndoModalHeader";
import { EndoModalBody } from "./modal/EndoModalBody";
import { EndoModalFooter } from "./modal/EndoModalFooter";

export * from "./endoCanalConstants";
export { useEndoCanalLogic } from "./useEndoCanalLogic";
export { EndoQuickToolbar } from "./EndoQuickToolbar";
export { EndoCanalTable } from "./EndoCanalTable";
export { EndoClinicalParams } from "./EndoClinicalParams";

export interface EndoCanalLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (protocolText: string, canals: EndoCanalData[]) => void;
	readonly onSaveCanals?: (canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void;
	readonly onSave?: (savedCanals: EndoCanalData[], noteText?: string) => void;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
}

export function EndoCanalLogModal(props: EndoCanalLogModalProps) {
	const logic = useEndoCanalLogic(props);
	if (!props.isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-x-clip"
			role="dialog"
			aria-modal="true"
			aria-label={`Эндодонтический журнал каналов зуба ${logic.activeTooth}`}
			data-testid="endo-canal-log-modal"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-t sm:border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-t-[24px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-w-full">
				<EndoModalHeader
					toothAnatomicalName={logic.toothAnatomicalName}
					toothState={props.toothState}
					isLoadingFromDb={logic.isLoadingFromDb}
					onClose={props.onClose}
				/>

				<EndoModalBody
					toolbarProps={{
						activeTooth: logic.activeTooth,
						handleSwitchTooth: logic.handleSwitchTooth,
						handleApplyExpressApicalPreset: logic.handleApplyExpressApicalPreset,
						handleApplyCaOh2Protocol: logic.handleApplyCaOh2Protocol,
						handleApplyPulpitisPreset: logic.handleApplyPulpitisPreset,
						isPresetsMenuOpen: logic.isPresetsMenuOpen,
						setIsPresetsMenuOpen: logic.setIsPresetsMenuOpen,
						handleApplyPrimaryEndoPreset: logic.handleApplyPrimaryEndoPreset,
						handleApplyRetreatmentPreset: logic.handleApplyRetreatmentPreset,
						handleApplyObturationPreset: logic.handleApplyObturationPreset,
						handleApplyPulpitisObturationPreset: logic.handleApplyPulpitisObturationPreset,
						handleApplyPeriodontitisDestructivePreset: logic.handleApplyPeriodontitisDestructivePreset,
						handleApplyStandardProtocol: logic.handleApplyStandardProtocol,
						handleResetToDefaults: logic.handleResetToDefaults,
						handleApplyAnatomicalLengths: logic.handleApplyAnatomicalLengths,
						handleAddCanal: logic.handleAddCanal,
					}}
					tableProps={{
						canals: logic.canals,
						suggestedCanalNames: logic.suggestedCanalNames,
						stageStamp: logic.stageStamp,
						handleCanalChange: logic.handleCanalChange,
						handleAdjustCanalLength: logic.handleAdjustCanalLength,
						handleCanalLengthInputChange: logic.handleCanalLengthInputChange,
						handleSetCanalLength: logic.handleSetCanalLength,
						handleRemoveCanal: logic.handleRemoveCanal,
						renderIsoColorBadge: logic.renderIsoColorBadge,
						handleToggleCanalObliteration: logic.handleToggleCanalObliteration,
					}}
					clinicalProps={{
						rotarySystem: logic.rotarySystem,
						setRotarySystem: logic.setRotarySystem,
						irrigation: logic.irrigation,
						setIrrigation: logic.setIrrigation,
						radiologyControl: logic.radiologyControl,
						setRadiologyControl: logic.setRadiologyControl,
						generatedProtocolText: logic.generatedProtocolText,
						copied: logic.copied,
						handleCopyText: logic.handleCopyText,
					}}
				/>

				<EndoModalFooter
					stageStamp={logic.stageStamp}
					setStageStamp={logic.setStageStamp}
					isSaving={logic.isSaving}
					isFooterMenuOpen={logic.isFooterMenuOpen}
					setIsFooterMenuOpen={logic.setIsFooterMenuOpen}
					onPrintWorksheet={logic.handlePrintWorksheet}
					onSaveCanalsOnly={logic.handleSaveCanalsOnly}
					onCopyText={logic.handleCopyText}
					onResetToDefaults={logic.handleResetToDefaults}
					onCopyPatientMemo={logic.handleCopyPatientMemo}
					onInsertToProtocol={logic.handleInsertToProtocol}
					onClose={props.onClose}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export default EndoCanalLogModal;
