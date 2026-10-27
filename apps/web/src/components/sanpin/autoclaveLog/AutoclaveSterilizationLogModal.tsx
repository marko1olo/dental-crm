import React from "react";
import { createPortal } from "react-dom";
import { AutoclaveSterilizationLogTab } from "./AutoclaveSterilizationLogTab.js";
import { AutoclaveNewCycleTab } from "./AutoclaveNewCycleTab.js";
import { AutoclaveLogModalHeader } from "./AutoclaveLogModalHeader";
import { AutoclaveLogModalTabs, type AutoclaveModalTab } from "./AutoclaveLogModalTabs";
import { useAutoclaveLogModalLogic } from "./useAutoclaveLogModalLogic";
import { DEFAULT_CLINIC_LEGAL_INFO, type ClinicLegalInfo } from "./autoclaveLogEngine.js";

export interface AutoclaveSterilizationLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: AutoclaveModalTab | "chamber_points" | "biocontrol" | "analytics";
	readonly clinicInfo?: ClinicLegalInfo;
}

export function AutoclaveSterilizationLogModal({
	isOpen,
	onClose,
	initialTab = "sterilization_log",
	clinicInfo = DEFAULT_CLINIC_LEGAL_INFO,
}: AutoclaveSterilizationLogModalProps) {
	const normalizedInitialTab = initialTab === "journal_257" ? "sterilization_log" : initialTab;
	const logic = useAutoclaveLogModalLogic(isOpen, normalizedInitialTab as any);

	if (!isOpen) return null;

	const isLogTabActive = logic.activeTab === "sterilization_log" || logic.activeTab === ("journal_257" as any);

	const modalContent = (
		<div className="autoclave-log-modal-overlay" role="dialog" aria-modal="true" aria-label="Журнал контроля автоклавирования" onClick={onClose}>
			<div className="autoclave-log-modal-container" onClick={(e) => e.stopPropagation()}>
				<AutoclaveLogModalHeader onClose={onClose} />
				<AutoclaveLogModalTabs activeTab={logic.activeTab} onSelectTab={logic.setActiveTab} recordsCount={logic.records.length} />
				<div className="autoclave-log-body">
					{logic.activeTab === "new_cycle" && (
						<AutoclaveNewCycleTab
							onSaveRecord={logic.handleSaveNewRecord}
							defaultOperatorName={clinicInfo.headNurse}
							defaultHeadNurseName={clinicInfo.chiefDoctor}
							latestCycleNumber={logic.records.length + 1}
						/>
					)}
					{isLogTabActive && (
						<AutoclaveSterilizationLogTab
							records={logic.records}
							onDeleteRecord={logic.handleDeleteRecord}
							onVerifyRecord={logic.handleVerifyRecord}
							onBatchAddRecords={logic.handleBatchAddRecords}
							onOpenNewCycle={() => logic.setActiveTab("new_cycle")}
							clinicInfo={clinicInfo}
						/>
					)}
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") return modalContent;
	return createPortal(modalContent, document.body);
}

export { AutoclaveSterilizationLogModal as AutoclaveLog257Modal };
export type { AutoclaveSterilizationLogModalProps as AutoclaveLog257ModalProps };
export default AutoclaveSterilizationLogModal;
