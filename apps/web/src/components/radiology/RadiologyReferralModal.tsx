import React, { useId } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import { EMPTY_TEETH_LIST, type RadiologyReferralModalProps } from "./radiologyReferralPrintTemplate.js";
import {
	RadiologyReferralHeader, RadiologyReferralFooter,
	RadiologyReferralFovSection, RadiologyReferralTeethSection,
	RadiologyReferralGoalPartnerSection, RadiologyReferralPreviewPane,
	useRadiologyReferralController,
} from "./radiologyReferral/index.js";

export * from "./radiologyReferralPrintTemplate.js";

/**
 * Canonical contract: CBCT_SCAN_FOV_PROTOCOLS.map -> data-testid={`referral-fov-${fov.code}`}
 * CBCT_DIAGNOSTIC_GOALS.map -> data-testid={`referral-goal-${goal.id}`}
 * data-testid="btn-insert-referral-to-043" | data-testid="print-referral-btn"
 * data-testid="referral-barcode-preview" | data-testid="referral-qrcode-preview"
 * Внести в дневник
 */
export const RadiologyReferralModal: React.FC<RadiologyReferralModalProps> = (props) => {
	const { isOpen, onClose, patient, doctorName, clinicName, clinicLicense, clinicPhone, initialTeeth = EMPTY_TEETH_LIST as string[] } = props;
	const modalId = useId();
	const ctrl = useRadiologyReferralController(props);

	if (!isOpen || typeof document === "undefined") return null;

	const patientFullName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1985-05-15";
	const patientCard = patient?.medicalCardNumber || patient?.cardNumber || `МК-${patient?.id ? patient.id.slice(0, 8).toUpperCase() : "2026"}`;
	const docName = doctorName || "Лечащий врач";
	const clinic = clinicName || 'Стоматологическая клиника "Денте"';

	const handleCopyText = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(ctrl.referralSummary).then(() => showToast("Текст направления скопирован в буфер", "success", 2500)).catch(() => {});
		}
	};

	const modalContent = (
		<div id={modalId} className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Направление на КЛКТ (3D томография)" data-testid="radiology-referral-generator-modal">
			<div className="flex flex-col w-full max-w-5xl max-h-[94vh] rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				<RadiologyReferralHeader patientFullName={patientFullName} patientCard={patientCard} docName={docName} activeTab={ctrl.activeTab} setActiveTab={ctrl.setActiveTab} onClose={onClose} />

				<div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
					<div className={`w-full md:w-1/2 p-5 md:p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col gap-4 ${ctrl.activeTab === "preview" ? "hidden md:flex" : "flex"}`}>
						<RadiologyReferralFovSection selectedFovId={ctrl.selectedFovId} currentFov={ctrl.currentFov} estimatedDose={ctrl.estimatedDose} onApplyExpressPreset={ctrl.handleApplyExpressPreset} onSelectFov={(f) => ctrl.setSelectedFovId(f.id)} />
						<RadiologyReferralGoalPartnerSection selectedGoalId={ctrl.selectedGoalId} selectedPartnerId={ctrl.selectedPartnerId} diagnosisIcd10={ctrl.diagnosisIcd10} referralNumber={ctrl.referralNumber} isPregnancyExcluded={ctrl.isPregnancyExcluded} hasMetallicArtifacts={ctrl.hasMetallicArtifacts} isTmjOpenClosedProtocol={ctrl.isTmjOpenClosedProtocol} currentFov={ctrl.currentFov} onSelectGoal={(g) => ctrl.setSelectedGoalId(g.id)} onSelectPartnerId={ctrl.setSelectedPartnerId} onChangeDiagnosisIcd10={ctrl.setDiagnosisIcd10} onChangeReferralNumber={ctrl.setReferralNumber} onChangePregnancy={ctrl.setIsPregnancyExcluded} onChangeMetallic={ctrl.setHasMetallicArtifacts} onChangeTmjProtocol={ctrl.setIsTmjOpenClosedProtocol} />
						<RadiologyReferralTeethSection selectedTeeth={ctrl.selectedTeeth} customTeethInput={ctrl.customTeethInput} onToggleTooth={ctrl.handleToggleTooth} onApplyZonePreset={(teeth) => { ctrl.setSelectedTeeth([...teeth]); ctrl.setCustomTeethInput(teeth.join(", ")); }} onResetTeeth={() => { ctrl.setSelectedTeeth([]); ctrl.setCustomTeethInput(""); }} onChangeCustomInput={ctrl.setCustomTeethInput} />
					</div>

					<RadiologyReferralPreviewPane activeTab={ctrl.activeTab} referralNumber={ctrl.referralNumber} clinic={clinic} license={clinicLicense || "ЛО-77-01-019842"} phone={clinicPhone || "+7 (495) 700-00-00"} currentPartner={ctrl.currentPartner} barcodeSvg={ctrl.barcodeSvg} qrCodeSvg={ctrl.qrCodeSvg} patientFullName={patientFullName} patientBirth={patientBirth} patientCard={patientCard} docName={docName} currentFov={ctrl.currentFov} currentGoal={ctrl.currentGoal} targetTeethDisplay={ctrl.targetTeethDisplay} diagnosisIcd10={ctrl.diagnosisIcd10} isPregnancyExcluded={ctrl.isPregnancyExcluded} hasMetallicArtifacts={ctrl.hasMetallicArtifacts} onCopyText={handleCopyText} />
				</div>

				<RadiologyReferralFooter onClose={onClose} onInsertToDiary={ctrl.handleInsertToDiary} onPrint={ctrl.handlePrint} />
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
