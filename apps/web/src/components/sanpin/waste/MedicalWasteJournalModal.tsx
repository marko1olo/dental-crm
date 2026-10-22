import type React from "react";
import { createPortal } from "react-dom";
import type { MedicalWasteJournalRecord, MedicalWasteTransferAct } from "./medicalWasteEngine.js";
import "./medicalWaste.css";
import { MedicalWasteAccumulateTab } from "./MedicalWasteAccumulateTab";
import { MedicalWasteJournalTableTab } from "./MedicalWasteJournalTableTab";
import { MedicalWasteTransferActTab } from "./MedicalWasteTransferActTab";
import { MedicalWasteModalHeader } from "./MedicalWasteModalHeader";
import { MedicalWasteModalNav } from "./MedicalWasteModalNav";
import { useMedicalWasteJournalModalState } from "./useMedicalWasteJournalModalState";

export interface MedicalWasteJournalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialRecords?: readonly MedicalWasteJournalRecord[] | undefined;
	readonly onRecordAdded?: ((record: MedicalWasteJournalRecord) => void) | undefined;
	readonly onActCreated?: ((act: MedicalWasteTransferAct) => void) | undefined;
}

export const MedicalWasteJournalModal: React.FC<MedicalWasteJournalModalProps> = ({
	isOpen,
	onClose,
	initialRecords = [],
	onRecordAdded,
	onActCreated,
}) => {
	const state = useMedicalWasteJournalModalState(initialRecords, onRecordAdded, onActCreated);

	if (!isOpen) return null;

	const modalContent = (
		<div className="waste-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="waste-modal-title">
			<div className="waste-modal-container" onClick={(e) => e.stopPropagation()}>
				<MedicalWasteModalHeader onClose={onClose} />
				<MedicalWasteModalNav
					activeTab={state.activeTab}
					setActiveTab={state.setActiveTab}
					recordsCount={state.records.length}
				/>
				<div className="waste-modal-body">
					{state.activeTab === "accumulate" && (
						<MedicalWasteAccumulateTab
							selectedClass={state.selectedClass}
							handleClassChange={state.handleClassChange}
							selectedPackaging={state.selectedPackaging}
							setSelectedPackaging={state.setSelectedPackaging}
							packageCount={state.packageCount}
							setPackageCount={state.setPackageCount}
							grossWeightInput={state.grossWeightInput}
							setGrossWeightInput={state.setGrossWeightInput}
							currentWeights={state.currentWeights}
							decontamMethod={state.decontamMethod}
							setDecontamMethod={state.setDecontamMethod}
							storageLocation={state.storageLocation}
							setStorageLocation={state.setStorageLocation}
							sealNumber={state.sealNumber}
							setSealNumber={state.setSealNumber}
							barcode={state.barcode}
							handleAddRecord={state.handleAddRecord}
							handleQuickShiftWaste={state.handleQuickShiftWaste}
							isSubmittingQuickShift={state.isSubmittingQuickShift}
						/>
					)}
					{state.activeTab === "journal" && (
						<MedicalWasteJournalTableTab
							records={state.records}
							onExportCsv={state.handleExportCsv}
							onPrintThermalSticker={state.handlePrintThermalSticker}
						/>
					)}
					{state.activeTab === "transfer_act" && (
						<MedicalWasteTransferActTab
							actNumber={state.actNumber}
							setActNumber={state.setActNumber}
							disposalCompanyName={state.disposalCompanyName}
							setDisposalCompanyName={state.setDisposalCompanyName}
							disposalContractNo={state.disposalContractNo}
							setDisposalContractNo={state.setDisposalContractNo}
							driverName={state.driverName}
							setDriverName={state.setDriverName}
							vehiclePlate={state.vehiclePlate}
							setVehiclePlate={state.setVehiclePlate}
							records={state.records}
							onCreateAndPrintAct={state.handleCreateAndPrintAct}
						/>
					)}
				</div>
				<footer className="waste-modal-footer">
					<button type="button" className="waste-btn waste-btn-secondary" onClick={onClose}>
						Закрыть
					</button>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};

export * from "./MedicalWasteAccumulateTab";
export * from "./MedicalWasteJournalTableTab";
export * from "./MedicalWasteTransferActTab";
export * from "./useMedicalWasteJournalModalState";
