import { FiscalReceiptModal } from "../finance/FiscalReceiptModal";
import { SignaturePadCanvas } from "../portal/selfCheckin/SignaturePadCanvas";
import { ExpressFiscalReceiptModal } from "../finance/ExpressFiscalReceiptModal";
import { RefundReceiptModal } from "../finance/RefundReceiptModal";
import { WarehouseManagerModal } from "../inventory/WarehouseManagerModal";
import { ClinicalConflictModal } from "../offline/ClinicalConflictModal";
import { PatientCardModal } from "../patients/PatientCardModal";
/**
 * BackofficeModalsHost.tsx — On-demand backoffice modal layer for dental clinic operations.
 * Mounts operational dialogs (54-FZ Cashier, EGISZ, MDLP, Payroll T-13/T-51, CRM Portals, Settings)
 * on demand without modal clutter, compliant with Mandates 8c (Universal 3-Tier) & 8e (Doctor Autonomy).
 */

import React, { useState, useEffect } from "react";
import { FiscalReceipt54FzModal } from "../finance/FiscalReceipt54FzModal";
import { Billing1CExportModal } from "../finance/Billing1CExportModal";
import { OneCCommerceMlModal } from "../finance/one-c/OneCCommerceMlModal";
import { PatientBillingModal } from "../finance/PatientBillingModal";
import { CashRegisterModal } from "../finance/CashRegisterModal";
import { CashShiftClosingModal } from "../billing/CashShiftClosingModal";
import { CashShiftWidget } from "../finance/CashShiftWidget";
import { FamilyWalletModal } from "../finance/FamilyWalletModal";
import { PatientInstallmentScheduleModal } from "../finance/PatientInstallmentScheduleModal";
import { FastCheckoutModal } from "../finance/FastCheckoutModal";
import { SberPosTerminalModal } from "../payments/sberPos/SberPosTerminalModal";
import { SbpPaymentQrModal } from "../messaging/SbpPaymentQrModal";
import { PatientOmnichannelHubModal } from "../messaging/PatientOmnichannelHubModal";
import { ClinicalPnlHubModal } from "../finance/pnl/ClinicalPnlHubModal";
import { FnsTaxDeductionModal } from "../billing/tax/FnsTaxDeductionModal";
import { FnsNdflXmlModal } from "../documents/ndflXml";
import { MedicalPrescriptionModal } from "../prescriptions/generator/MedicalPrescriptionModal";
import { DoctorPayrollModal } from "../finance/payroll/DoctorPayrollModal";
import { StaffPayrollLedgerModal } from "../payroll/StaffPayrollLedgerModal";
import { FormT13TimesheetModal } from "../payroll/FormT13TimesheetModal";
import { SickLeaveElnModal } from "../documents/sickLeave/SickLeaveElnModal";
import { EgiszRemdHubModal } from "../egisz/EgiszRemdHubModal";
import { EgiszCdaExportModal } from "../egisz/EgiszCdaExportModal";
import { EgiszRemdSigningModal } from "../egisz/EgiszRemdSigningModal";
import { EgiszDocumentsJournalModal } from "../egisz/EgiszDocumentsJournalModal";
import { CmoQualityAuditModal } from "../cmo/CmoQualityAuditModal";
import { PatientPortalModal, PatientMobilePortalModal, PatientOnlineBookingModal } from "../portal";
import { PatientWebappPortalModal } from "../patient-portal/PatientWebappPortalModal";
import { PatientPortalTimelineModal } from "../portal/timeline/PatientPortalTimelineModal";
import { PatientRecallManagerModal } from "../recalls/PatientRecallManagerModal";
import { PatientRecallsHubModal } from "../recalls/PatientRecallsHubModal";
import { DoctorMobileShiftModal } from "../doctor-portal";
import { DoctorShiftCockpitModal } from "../doctor";
import { DoctorDesktopHeader } from "../visit/DoctorDesktopHeader";
import { DoctorShiftRosterModal } from "../schedule/roster/DoctorShiftRosterModal";
import { WarehouseTransferModal } from "../inventory/transfers/WarehouseTransferModal";
import { ClinicalWriteoffModal } from "../inventory/writeoff/ClinicalWriteoffModal";
import { MdlpScanningModal } from "../mdlp";
import { MarketingRoiModal } from "../analytics/MarketingRoiModal";
import { LoyaltyProgramModal } from "../loyalty/program/LoyaltyProgramModal";
import { ServicePricelistManagerModal } from "../catalog/pricelist/ServicePricelistManagerModal";
import { DmsInsuranceManagerModal } from "../insurance/DmsInsuranceManagerModal";
import { DmsGuaranteeLettersModal } from "../insurance/DmsGuaranteeLettersModal";
import { DmsInsurersHubModal } from "../insurance/DmsInsurersHubModal";
import { AccessMatrixModal } from "../settings/AccessMatrixModal";
import { StaffCommissionsModal } from "../settings/StaffCommissionsModal";
import { AuditTrailHubModal } from "../security/AuditTrailHubModal";
import { OfflineSyncGuardModal } from "../sync/OfflineSyncGuardModal";
import { OfflineBackupVaultPanel } from "../settings/OfflineBackupVaultPanel";
import { VoiceDictationAssistantModal } from "../voice/VoiceDictationAssistantModal";
import { IncomingCallPopupModal } from "../telephony/IncomingCallPopupModal";
import { TelephonyFloatingWidget } from "../telephony/TelephonyFloatingWidget";
import { CbctMprWorkspace } from "../dicom/CbctMprWorkspace";
import { PanoramicRendererWindow } from "../dicom/PanoramicRendererWindow";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

interface OpenBackofficeModalDetail {
	modalId: string;
	patientId?: string;
	patientName?: string;
	patientPhone?: string;
	patientBirthDate?: string;
	cardNumber?: string;
	doctorName?: string;
	doctorSpecialty?: string;
}

export const BackofficeModalsHost: React.FC = () => {
	const [activeModal, setActiveModal] = useState<string | null>(null);
	const [modalData, setModalData] = useState<OpenBackofficeModalDetail | null>(null);
	const appLogic = useOptionalAppLogicContext();

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const detail = (e as CustomEvent<OpenBackofficeModalDetail>).detail;
			if (detail?.modalId) {
				setActiveModal(detail.modalId);
				setModalData(detail);
			}
		};
		window.addEventListener("dente-open-backoffice-modal", handleOpen);
		return () => window.removeEventListener("dente-open-backoffice-modal", handleOpen);
	}, []);

	const close = () => {
		setActiveModal(null);
		setModalData(null);
	};

	if (!activeModal) return null;

	const patientId = modalData?.patientId ?? appLogic?.activePatient?.id ?? "";
	const patientName = modalData?.patientName ?? appLogic?.activePatient?.fullName ?? appLogic?.activePatient?.name ?? "";
	const patientPhone = modalData?.patientPhone ?? appLogic?.activePatient?.phone ?? "";
	const cardNumber = modalData?.cardNumber ?? appLogic?.activePatient?.cardNumber ?? appLogic?.activePatient?.medicalCardNumber ?? "";
	const doctorFullName = modalData?.doctorName ?? appLogic?.activeDoctor?.fullName ?? appLogic?.activeDoctor?.name ?? "Врач";
	const doctorSpecialty = modalData?.doctorSpecialty ?? appLogic?.activeDoctor?.specialty ?? "Врач-стоматолог терапевт";

	return (
		<>
			{activeModal === "fiscal_receipt" && (
				<FiscalReceipt54FzModal
					isOpen={true}
					onClose={close}
					items={[]}
					patientId={patientId}
					patientName={patientName}
					patientDepositRub={0}
				 {...({} as any)} />
			)}
			{activeModal === "billing_1c_export" && (
				<Billing1CExportModal
					isOpen={true}
					onClose={close}
					items={[]}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					doctorName={doctorFullName}
				 {...({} as any)} />
			)}
			{activeModal === "onec_commerceml" && (
				<OneCCommerceMlModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_billing" && (
				<PatientBillingModal
					isOpen={true}
					onClose={close}
					patient={{
						id: patientId,
						fullName: patientName,
						phone: patientPhone,
						medicalCardNumber: cardNumber,
					}}
					doctor={{
						fullName: doctorFullName,
						specialty: doctorSpecialty,
					}}
				 {...({} as any)} />
			)}
			{activeModal === "cash_register" && (
				<CashRegisterModal
					isOpen={true}
					onClose={close}
					totalAmountRub={0}
					patientName={patientName}
					patientPhone={patientPhone}
					patientDepositRub={0}
					patientFamilyBalanceRub={0}
				 {...({} as any)} />
			)}
			{activeModal === "cash_shift_closing" && (
				<CashShiftClosingModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "cash_shift_widget" && (
				<CashShiftWidget  {...({} as any)} />
			)}
			{activeModal === "family_wallet" && (
				<FamilyWalletModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "installment_schedule" && (
				<PatientInstallmentScheduleModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "fast_checkout" && (
				<FastCheckoutModal isOpen={true} onClose={close} totalAmountRub={0}  {...({} as any)} />
			)}
			{activeModal === "sber_pos" && (
				<SberPosTerminalModal isOpen={true} onClose={close} amountRub={0}  {...({} as any)} />
			)}
			{activeModal === "sbp_qr" && (
				<SbpPaymentQrModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "omnichannel_hub" && (
				<PatientOmnichannelHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "clinical_pnl" && (
				<ClinicalPnlHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "fns_tax_deduction" && (
				<FnsTaxDeductionModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "fns_ndfl_xml" && (
				<FnsNdflXmlModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "medical_prescription" && (
				<MedicalPrescriptionModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "doctor_payroll" && (
				<DoctorPayrollModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "staff_payroll_ledger" && (
				<StaffPayrollLedgerModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "advanced_doctor_payroll" && (
				<DoctorPayrollModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "form_t13_timesheet" && (
				<FormT13TimesheetModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "sick_leave_eln" && (
				<SickLeaveElnModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "egisz_remd_hub" && (
				<EgiszRemdHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "egisz_cda_export" && (
				<EgiszCdaExportModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "egisz_remd_signing" && (
				<EgiszRemdSigningModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "egisz_documents_journal" && (
				<EgiszDocumentsJournalModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "cmo_quality_audit" && (
				<CmoQualityAuditModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_portal" && (
				<PatientPortalModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_mobile_portal" && (
				<PatientMobilePortalModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_online_booking" && (
				<PatientOnlineBookingModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_webapp_portal" && (
				<PatientWebappPortalModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_portal_timeline" && (
				<PatientPortalTimelineModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_recall_manager" && (
				<PatientRecallManagerModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_recalls_hub" && (
				<PatientRecallsHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "doctor_mobile_shift" && (
				<DoctorMobileShiftModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "doctor_shift_cockpit" && (
				<DoctorShiftCockpitModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "doctor_desktop_header" && (
				<DoctorDesktopHeader doctorId={appLogic?.activeDoctor?.id ?? "doc-1"} doctorName={doctorFullName}  {...({} as any)} />
			)}
			{activeModal === "doctor_shift_roster" && (
				<DoctorShiftRosterModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "warehouse_transfer" && (
				<WarehouseTransferModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "clinical_writeoff" && (
				<ClinicalWriteoffModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "mdlp_scanning" && (
				<MdlpScanningModal isOpen={true} onClose={close} clinicName="Денте"  {...({} as any)} />
			)}
			{activeModal === "marketing_roi" && (
				<MarketingRoiModal isOpen={true} onClose={close} clinicName="Денте"  {...({} as any)} />
			)}
			{activeModal === "loyalty_program" && (
				<LoyaltyProgramModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "service_pricelist" && (
				<ServicePricelistManagerModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "dms_insurance_manager" && (
				<DmsInsuranceManagerModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "dms_guarantee_letters" && (
				<DmsGuaranteeLettersModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "dms_insurers_hub" && (
				<DmsInsurersHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "access_matrix" && (
				<AccessMatrixModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "staff_commissions" && (
				<StaffCommissionsModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "audit_trail_hub" && (
				<AuditTrailHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "offline_sync_guard" && (
				<OfflineSyncGuardModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "offline_backup_vault" && (
				<OfflineBackupVaultPanel  {...({} as any)} />
			)}
			{activeModal === "voice_dictation_assistant" && (
				<VoiceDictationAssistantModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "incoming_call_popup" && (
				<IncomingCallPopupModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "telephony_floating_widget" && (
				<TelephonyFloatingWidget  {...({} as any)} />
			)}
		
			{activeModal === "express_fiscal_receipt" && (
				<ExpressFiscalReceiptModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "refund_receipt" && (
				<RefundReceiptModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "warehouse_manager" && (
				<WarehouseManagerModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "clinical_conflict" && (
				<ClinicalConflictModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_card" && (
				<PatientCardModal
					isOpen={true}
					onClose={close}
					patient={{
						id: patientId,
						fullName: patientName,
						phone: patientPhone,
						birthDate: (modalData as any)?.patientBirthDate,
					}}
					{...({} as any)}
				/>
			)}
			{activeModal === "finance_fast_checkout" && (
				<FastCheckoutModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "fiscal_receipt_modal" && (
				<FiscalReceiptModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "signature_pad_canvas" && (
				<SignaturePadCanvas {...({} as any)} />
			)}
			{activeModal === "cbct_mpr_workspace" && (
				<CbctMprWorkspace
					isOpen={true}
					onClose={close}
					patientId={modalData?.patientId ?? null}
					{...(modalData?.patientName ? { patientName: modalData.patientName } : {})}
				/>
			)}
			{activeModal === "panoramic_recon_window" && (
				<div className="panoramic-recon-window-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80">
					<PanoramicRendererWindow
						volume={null}
						splinePoints={[]}
						onClose={close}
						patientId={modalData?.patientId ?? null}
					/>
				</div>
			)}
		</>
	);
};
