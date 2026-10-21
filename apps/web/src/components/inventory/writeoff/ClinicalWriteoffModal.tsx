import React from "react";
import { createPortal } from "react-dom";
import type { ClinicalWriteoffDocument, CompletedClinicalService } from "./clinicalWriteoffEngine.js";
import type { CabinetStockBatch } from "./clinicalWriteoffPresets.js";
import { ClinicalWriteoffAlerts } from "./ClinicalWriteoffAlerts.js";
import { ClinicalWriteoffFooter } from "./ClinicalWriteoffFooter.js";
import { ClinicalWriteoffHeader } from "./ClinicalWriteoffHeader.js";
import { ClinicalWriteoffPassportBar } from "./ClinicalWriteoffPassportBar.js";
import { ClinicalWriteoffQuickStrip } from "./ClinicalWriteoffQuickStrip.js";
import { ClinicalWriteoffServicesList } from "./ClinicalWriteoffServicesList.js";
import { ClinicalWriteoffSummaryBar } from "./ClinicalWriteoffSummaryBar.js";
import { useClinicalWriteoffLogic } from "./useClinicalWriteoffLogic.js";

export { DEFAULT_CLINICAL_SERVICES } from "./useClinicalWriteoffLogic.js";

export interface ClinicalWriteoffModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onConfirmWriteoff?: ((doc: ClinicalWriteoffDocument) => void | Promise<void>) | undefined;
	readonly initialServices?: readonly CompletedClinicalService[] | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly assistantFullName?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly cabinetNameRu?: string | undefined;
	readonly stockBatches?: readonly CabinetStockBatch[] | undefined;
	readonly defaultFormType?: "0504230" | "M11" | "TORG16" | undefined;
	readonly isDeducting?: boolean | undefined;
}

export const ClinicalWriteoffModal: React.FC<ClinicalWriteoffModalProps> = (props) => {
	const { isOpen, onClose, isDeducting = false } = props;
	const {
		patientName, patientId, doctorFullName, doctorSpecialty, selectedCabinetId, setSelectedCabinetId,
		actNumber, setActNumber, actDate, setActDate, services, lines, totals, validation,
		handleQuantityChange, handleReasonChange, handleSerialNumberChange, handleResetToNorm, handleRemoveLine,
		handleQuickCarpuleWriteoff, handleQuickAnesthesiaPackageWriteoff, handleQuickTherapyWriteoff, handleQuickSurgeryWriteoff,
		handleConfirm, handleGenerateSupplierOrder, handlePrintAct, handleExportCsv,
	} = useClinicalWriteoffLogic(props);

	if (!isOpen) return null;

	const modalContent = (
		<div className="cw-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cw-modal-title" data-testid="clinical-writeoff-modal">
			<div className="cw-modal-container" onClick={(e) => e.stopPropagation()}>
				<ClinicalWriteoffHeader onClose={onClose} />

				<div className="cw-modal-body">
					<ClinicalWriteoffPassportBar
						patientName={patientName}
						patientId={patientId}
						doctorFullName={doctorFullName}
						doctorSpecialty={doctorSpecialty}
						selectedCabinetId={selectedCabinetId}
						onCabinetChange={setSelectedCabinetId}
						actNumber={actNumber}
						onActNumberChange={setActNumber}
						actDate={actDate}
						onActDateChange={setActDate}
					/>

					<ClinicalWriteoffQuickStrip
						onQuickCarpuleWriteoff={handleQuickCarpuleWriteoff}
						onQuickAnesthesiaPackageWriteoff={handleQuickAnesthesiaPackageWriteoff}
						onQuickTherapyWriteoff={handleQuickTherapyWriteoff}
						onQuickSurgeryWriteoff={handleQuickSurgeryWriteoff}
					/>

					<ClinicalWriteoffAlerts
						totals={totals}
						validationErrors={validation.errors}
						isValid={validation.isValid}
						onGenerateSupplierOrder={handleGenerateSupplierOrder}
					/>

					<ClinicalWriteoffServicesList
						services={services}
						lines={lines}
						onQuantityChange={handleQuantityChange}
						onReasonChange={handleReasonChange}
						onSerialNumberChange={handleSerialNumberChange}
						onResetToNorm={handleResetToNorm}
						onRemoveLine={handleRemoveLine}
					/>

					<ClinicalWriteoffSummaryBar servicesCount={services.length} totals={totals} />
				</div>

				<ClinicalWriteoffFooter
					totals={totals}
					isValid={validation.isValid}
					validationError={validation.errors[0]}
					isDeducting={isDeducting}
					onClose={onClose}
					onConfirm={handleConfirm}
					onPrintAct={handlePrintAct}
					onExportCsv={handleExportCsv}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
};

export default ClinicalWriteoffModal;
