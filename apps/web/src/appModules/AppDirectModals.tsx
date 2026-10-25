/**
 * DENTE Dental CRM — Direct Clinical Modals (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React, { Suspense } from "react";
import { PrescriptionModal } from "../components/prescriptions/PrescriptionModal";
import { lazyWithRetry } from "../lib/lazyWithRetry";
import type { AppHashRoutingState, AppSessionAuthState } from "./appStateTypes";
import { AppDirectSpecialtyModals } from "./AppDirectSpecialtyModals";

const ImplantPassportModal = lazyWithRetry(() =>
	import("../components/implants/ImplantPassportModal").then((m) => ({ default: m.ImplantPassportModal })),
);
const PatientRecallsHubModal = lazyWithRetry(() =>
	import("../components/recalls/PatientRecallsHubModal").then((m) => ({ default: m.PatientRecallsHubModal })),
);
const WarrantyPassportModal = lazyWithRetry(() =>
	import("../components/warranty/WarrantyPassportModal").then((m) => ({ default: m.WarrantyPassportModal })),
);
const LoyaltyProgramModal = lazyWithRetry(() =>
	import("../components/loyalty/program/LoyaltyProgramModal").then((m) => ({ default: m.LoyaltyProgramModal })),
);
const FastCheckoutModal = lazyWithRetry(() =>
	import("../components/finance/FastCheckoutModal").then((m) => ({ default: m.FastCheckoutModal })),
);
const ShiftCloseZReportModal = lazyWithRetry(() =>
	import("../components/finance/fiscal/ShiftCloseZReportModal").then((m) => ({ default: m.ShiftCloseZReportModal })),
);

interface AppDirectModalsProps {
	routing: AppHashRoutingState;
	sessionAuth: AppSessionAuthState;
	appLogic: any;
}

export function AppDirectModals({ routing, sessionAuth, appLogic }: AppDirectModalsProps) {
	const { activePatient, activeVisitPatient, activeDoctor, activeWorkspaceProfile } = appLogic;
	const staffUser = sessionAuth.activeStaffUser;
	const patient = activePatient || activeVisitPatient;
	const doctorName = staffUser?.fullName || activeDoctor?.fullName || "Лечащий врач";

	return (
		<>
			{routing.isPrescriptionForm107Open && (
				<PrescriptionModal
					isOpen={true}
					onClose={() => routing.setIsPrescriptionForm107Open(false)}
					patient={patient}
					doctorName={doctorName}
					initialSelectedDrugIds={routing.prescriptionInitialMedIds ?? (routing.prescriptionInitialMedId ? [routing.prescriptionInitialMedId] : undefined)}
				/>
			)}
			{routing.isImplantPassportDirectOpen && (
				<Suspense fallback={null}>
					<ImplantPassportModal
						isOpen={true}
						onClose={() => { routing.setIsImplantPassportDirectOpen(false); routing.setImplantPassportConfig(null); }}
						patientName={routing.implantPassportConfig?.patientName || patient?.fullName || "Пациент"}
						patientId={routing.implantPassportConfig?.patientId || patient?.id || ""}
						doctorName={routing.implantPassportConfig?.doctorName || doctorName}
						doctorId={routing.implantPassportConfig?.doctorId || staffUser?.id || activeDoctor?.id || ""}
						initialTooth={routing.implantPassportConfig?.toothNumber ?? 46}
					/>
				</Suspense>
			)}
			{routing.isRecallsHubOpen && (
				<Suspense fallback={null}>
					<PatientRecallsHubModal isOpen={true} onClose={() => routing.setIsRecallsHubOpen(false)} clinicName={activeWorkspaceProfile?.title || "DENTE Clinic"} />
				</Suspense>
			)}
			{routing.isWarrantyPassportOpen && (
				<Suspense fallback={null}>
					<WarrantyPassportModal
						isOpen={true}
						onClose={() => routing.setIsWarrantyPassportOpen(false)}
						patient={{ id: patient?.id || "pat-demo-01", fullName: patient?.fullName || "Смирнова Анна Сергеевна", cardNumber: patient?.cardNumber || "К-4819", phone: patient?.phone || "+7 (926) 412-88-99" }}
						doctorName={doctorName}
						clinicName={activeWorkspaceProfile?.title || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						completedStages={[
							{ id: "srv-comp-1", serviceCode804n: "A16.07.002.001", serviceTitle: "Восстановление зуба пломбой (Filtek Ultimate)", toothNumber: "1.6", price: 5500, completedAt: new Date().toISOString().slice(0, 10) },
							{ id: "srv-comp-2", serviceCode804n: "A16.07.004", serviceTitle: "Керамическая коронка (IPS e.max Press)", toothNumber: "2.4", price: 28000, completedAt: new Date().toISOString().slice(0, 10) },
							{ id: "srv-comp-3", serviceCode804n: "A16.07.006", serviceTitle: "Установка имплантата (Straumann BLX)", toothNumber: "4.6", price: 55000, completedAt: new Date().toISOString().slice(0, 10) },
						]}
					/>
				</Suspense>
			)}
			{routing.isLoyaltyProgramOpen && (
				<Suspense fallback={null}>
					<LoyaltyProgramModal
						isOpen={true}
						onClose={() => routing.setIsLoyaltyProgramOpen(false)}
						patientId={patient?.id || "pat-demo-01"}
						patientName={patient?.fullName || "Воронова Светлана Николаевна"}
						medicalCardNumber={patient?.cardNumber || "№ 4821-Л"}
						clinicName={activeWorkspaceProfile?.title || "ООО «Денте Стоматология»"}
						initialPointsBalance={1500}
						initialLifetimeSpentKop={4500000}
						currentInvoiceAmountKop={350000}
					/>
				</Suspense>
			)}
			{routing.isFastCheckoutDirectOpen && (
				<Suspense fallback={null}>
					<FastCheckoutModal
						isOpen={true}
						onClose={() => routing.setIsFastCheckoutDirectOpen(false)}
						totalBillRub={4500}
						totalBillKop={450000}
						patientId={patient?.id || "pat-demo-01"}
						patientName={patient?.fullName || "Воронова Светлана Николаевна"}
						patientPhone={patient?.phone || "+7 (926) 555-01-92"}
						patientFamilyBalanceRub={1200}
						patientBonusPointsRub={1500}
						patientLoyaltyPoints={1500}
						orderId="CHK-DEMO-001"
					/>
				</Suspense>
			)}
			{routing.isShiftCloseZReportDirectOpen && (
				<Suspense fallback={null}>
					<ShiftCloseZReportModal
						isOpen={true}
						onClose={() => routing.setIsShiftCloseZReportDirectOpen(false)}
						shiftNumber={42}
						cashierFullName={staffUser?.fullName || "Сидорова Анна Павловна"}
						clinicLegalName={activeWorkspaceProfile?.title || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						kktRegNumber="0004829104058291"
						onConfirmCloseShift={async () => {
							routing.setIsShiftCloseZReportDirectOpen(false);
						}}
					/>
				</Suspense>
			)}
			<AppDirectSpecialtyModals routing={routing} sessionAuth={sessionAuth} appLogic={appLogic} />
		</>
	);
}
