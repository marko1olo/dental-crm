import { ShieldCheck, X } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
import "./warrantyPassport.css";
import "./warrantyPassportRemediation.css";
import "./warrantyPassportMobile.css";
import type { CompletedTreatmentStage, WarrantyPassportModalProps } from "./warrantyPassport";
import {
	detectCategoryFromServiceTitle,
	mapCompletedStagesToWarrantyItems,
	useWarrantyPassportState,
	WarrantyConditionsStep,
	WarrantyItemsStep,
	WarrantyPreviewPrint,
	WarrantySignatureStep,
} from "./warrantyPassport";
import { WarrantyModalTabs } from "./warrantyPassport/modalParts/WarrantyModalTabs";
import { WarrantyModalFooter } from "./warrantyPassport/modalParts/WarrantyModalFooter";

export type { CompletedTreatmentStage, WarrantyPassportModalProps };
export { detectCategoryFromServiceTitle, mapCompletedStagesToWarrantyItems };

export const WarrantyPassportModal: React.FC<WarrantyPassportModalProps> = (props) => {
	const { isOpen, onClose, patient, completedStages } = props;
	const s = useWarrantyPassportState(props);

	if (!isOpen) return null;

	const handleIssueStandardOneClick = () => {
		if (s.items.length === 0) {
			if (completedStages && completedStages.length > 0) {
				s.handleImportCompletedStages();
			} else {
				s.handleAddItem();
			}
		}
		s.setRiskFactors((prev) => ({
			...prev,
			hygieneScore: 1.0,
			bruxism: false,
			nightGuardUsed: false,
			smoking: false,
			periodontitisHistory: false,
			highCariesActivity: false,
			uncontrolledDiabetes: false,
			complianceRegularCheckups: true,
		}));
		s.handleAttachTo043u();
		s.handlePrint();
	};

	const modalContent = (
		<div className="warranty-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
			<div className="warranty-modal-window" onClick={(e) => e.stopPropagation()}>
				<div className="warranty-mobile-drag-handle" aria-hidden="true" />

				<div className="warranty-modal-header">
					<div className="warranty-header-left">
						<div className="warranty-header-icon"><ShieldCheck size={22} /></div>
						<div className="warranty-header-title">
							<h3>Гарантийный паспорт & Сертификат качества</h3>
							<p>Гарантия клиники и стандарты качества • Карта № {patient?.cardNumber || "б/н"}</p>
						</div>
					</div>
					<div className="warranty-header-actions">
						<button type="button" className="warranty-btn-icon" onClick={onClose} title="Закрыть студию гарантий" aria-label="Закрыть">
							<X size={18} />
						</button>
					</div>
				</div>

				<WarrantyModalTabs
					activeTab={s.activeTab}
					setActiveTab={s.setActiveTab}
					checkupScheduleCount={s.calculation.checkupSchedule.length}
					remediationsCount={s.remediations.length}
				/>

				<div className="warranty-modal-body">
					{s.activeTab === "editor" && <WarrantyItemsStep completedStages={completedStages} {...s.itemsStepProps} />}
					{s.activeTab === "preview" && <WarrantyPreviewPrint certificateHtml={s.certificateHtml} onPrint={s.handlePrint} />}
					{s.activeTab === "schedule" && <WarrantyConditionsStep mode="schedule" calculation={s.calculation} />}
					{s.activeTab === "conditions" && <WarrantyConditionsStep mode="conditions" calculation={s.calculation} />}
					{s.activeTab === "remediation" && <WarrantySignatureStep {...s.signatureStepProps} />}
				</div>

				<WarrantyModalFooter
					certificateId={s.certificateId}
					integrityHash={s.certificateData.integrityHash}
					patientPhone={patient?.phone}
					shareMenuProps={s.shareMenuProps}
					onPrint={s.handlePrint}
					onAttachTo043u={s.handleAttachTo043u}
					onIssueStandardOneClick={handleIssueStandardOneClick}
					attachedStatus={s.attachedStatus}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
