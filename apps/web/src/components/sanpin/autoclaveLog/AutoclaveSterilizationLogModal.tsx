import React from "react";
import { createPortal } from "react-dom";
import { AutoclaveJournal257Tab } from "./AutoclaveJournal257Tab.js";
import { AutoclaveNewCycleTab } from "./AutoclaveNewCycleTab.js";
import { AutoclaveLogModalHeader } from "./AutoclaveLogModalHeader";
import { AutoclaveLogModalTabs } from "./AutoclaveLogModalTabs";
import { useAutoclaveLogModalLogic } from "./useAutoclaveLogModalLogic";
import { DEFAULT_CLINIC_LEGAL_INFO, type ClinicLegalInfo } from "./autoclaveLogEngine.js";
import "./autoclaveLog.css";

export interface AutoclaveSterilizationLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "new_cycle" | "journal_257" | "chamber_points" | "biocontrol" | "analytics";
	readonly clinicInfo?: ClinicLegalInfo;
}

export function AutoclaveSterilizationLogModal({
	isOpen,
	onClose,
	initialTab = "journal_257",
	clinicInfo = DEFAULT_CLINIC_LEGAL_INFO,
}: AutoclaveSterilizationLogModalProps) {
	const logic = useAutoclaveLogModalLogic(isOpen, initialTab);

	if (!isOpen) return null;

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
					{logic.activeTab === "journal_257" && (
						<AutoclaveJournal257Tab
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
