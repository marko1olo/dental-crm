import { SignaturePadCanvas } from "../portal/selfCheckin/SignaturePadCanvas";
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
import { TaxDeductionCertificateModal } from "../finance/TaxDeductionCertificateModal";
import { MedicalPrescriptionModal } from "../prescriptions/generator/MedicalPrescriptionModal";
import { DoctorPayrollModal } from "../finance/payroll/DoctorPayrollModal";
import { TimesheetT13Modal } from "../payroll/TimesheetT13Modal";
import { SickLeaveElnModal } from "../documents/sickLeave/SickLeaveElnModal";
import { EgiszRemdHubModal } from "../egisz/EgiszRemdHubModal";
import { CmoQualityAuditModal } from "../cmo/CmoQualityAuditModal";
import { PatientCabinetModal, PatientOnlineBookingModal } from "../portal";
import { PatientPortalTimelineModal } from "../portal/timeline/PatientPortalTimelineModal";
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
import { DmsGuaranteeLetterModal } from "../insurance/DmsGuaranteeLetterModal";
import { DmsInsurersHubModal } from "../insurance/DmsInsurersHubModal";
import { GranularRoleMatrixView } from "../settings/GranularRoleMatrixView";
import { StaffCommissionsPanel } from "../settings/StaffCommissionsPanel";
import { Calculator, ShieldCheck, X } from "lucide-react";
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

	useEffect(() => {
		if (!activeModal) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				close();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeModal]);

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
				<TaxDeductionCertificateModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "fns_ndfl_xml" && (
				<TaxDeductionCertificateModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "medical_prescription" && (
				<MedicalPrescriptionModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "doctor_payroll" && (
				<DoctorPayrollModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "staff_payroll_ledger" && (
				<DoctorPayrollModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "advanced_doctor_payroll" && (
				<DoctorPayrollModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "form_t13_timesheet" && (
				<TimesheetT13Modal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "sick_leave_eln" && (
				<SickLeaveElnModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "egisz_remd_hub" && (
				<EgiszRemdHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "egisz_cda_export" && (
				<EgiszRemdHubModal isOpen={true} onClose={close} initialTab="xml" />
			)}
			{activeModal === "egisz_remd_signing" && (
				<EgiszRemdHubModal isOpen={true} onClose={close} initialTab="signing" />
			)}
			{activeModal === "egisz_documents_journal" && (
				<EgiszRemdHubModal isOpen={true} onClose={close} initialTab="journal" />
			)}
			{activeModal === "cmo_quality_audit" && (
				<CmoQualityAuditModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_portal" && (
				<PatientCabinetModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_mobile_portal" && (
				<PatientCabinetModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_online_booking" && (
				<PatientOnlineBookingModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_webapp_portal" && (
				<PatientCabinetModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "patient_portal_timeline" && (
				<PatientPortalTimelineModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{(activeModal === "patient_recall_manager" || activeModal === "patient_recalls_hub") && (
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
				<DmsGuaranteeLetterModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "dms_insurers_hub" && (
				<DmsInsurersHubModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "access_matrix" && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="settings-access-modal-container"
					onClick={(e) => {
						if (e.target === e.currentTarget) close();
					}}
				>
					<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl p-3 sm:p-5 overflow-hidden max-h-[94vh] flex flex-col min-w-0">
						{/* Compact Modal Header (38px height) */}
						<div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-2 shrink-0 gap-3 min-w-0">
							<div className="flex items-center gap-2 min-w-0 flex-1">
								<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
									<ShieldCheck className="w-4 h-4" />
								</div>
								<div className="min-w-0 flex-1 flex items-center gap-2.5 flex-wrap">
									<h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0 break-words leading-none">
										Ролевая матрица доступа (RBAC 152-ФЗ)
									</h3>
									<span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-mono">
										8 ролей · 22 права
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={close}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
								data-testid="close-settings-access-modal-btn"
								aria-label="Закрыть матрицу доступа"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Monolithic Role Matrix Area (Occupies >= 80% modal viewport with pb-20 bottom frame clearance) */}
						<div className="flex-1 overflow-y-auto min-w-0 pr-0.5 pb-20 sm:pb-8" data-testid="settings-access-modal-scroll-body">
							<GranularRoleMatrixView
								initialRole={(modalData as any)?.initialRole}
								initialModuleFilter={(modalData as any)?.initialModuleFilter}
							/>
						</div>
					</div>
				</div>
			)}
			{activeModal === "staff_commissions" && (
				<div
					className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					data-testid="settings-staff-commissions-modal-container"
					onClick={(e) => {
						if (e.target === e.currentTarget) close();
					}}
				>
					<div className="relative w-full max-w-4xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[94vh] flex flex-col min-w-0">
						{/* High-contrast Modal Header with WCAG AAA typography (>= 15:1) */}
						<div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-3 min-w-0">
							<div className="flex items-center gap-2.5 min-w-0 flex-1">
								<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
									<Calculator className="w-5 h-5" />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0 break-words leading-tight">
										Ставки и комиссии врачей (Номенклатура 804н)
									</h3>
									<p className="text-xs text-slate-600 dark:text-slate-400 m-0 mt-0.5 break-words">
										Настройка процентов сдельной оплаты и удержаний за лабораторные этапы (ЗТЛ)
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={close}
								className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
								data-testid="close-settings-staff-commissions-modal-btn"
								aria-label="Закрыть модальное окно ставок"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Monolithic Content Area without card-in-card nesting */}
						<div className="flex-1 overflow-y-auto min-w-0 pr-1">
							<StaffCommissionsPanel isModalView={true} />
						</div>
					</div>
				</div>
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
				<FiscalReceipt54FzModal isOpen={true} onClose={close}  {...({} as any)} />
			)}
			{activeModal === "refund_receipt" && (
				<FiscalReceipt54FzModal
					isOpen={true}
					onClose={close}
					items={[]}
					patientId={patientId}
					patientName={patientName}
					patientDepositRub={0}
					initialTab="refund"
					{...({} as any)}
				/>
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
				<FiscalReceipt54FzModal isOpen={true} onClose={close}  {...({} as any)} />
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
