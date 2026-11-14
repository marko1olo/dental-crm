/**
 * DENTE Dental CRM — Direct Clinical Modals (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React, { Suspense } from "react";
import { PrescriptionModal } from "../components/prescriptions/PrescriptionModal";
import { lazyWithRetry } from "../lib/lazyWithRetry";
import type { AppHashRoutingState, AppSessionAuthState } from "./appStateTypes";
import { AppDirectSpecialtyModals } from "./AppDirectSpecialtyModals";

const PatientRecallsHubModal = lazyWithRetry(() =>
	import("../components/recalls/PatientRecallsHubModal").then((m) => ({ default: m.PatientRecallsHubModal })),
);
const WarrantyPassportModal = lazyWithRetry(() =>
	import("../components/warranty/WarrantyPassportModal").then((m) => ({ default: m.WarrantyPassportModal })),
);
const LoyaltyStudioModal = lazyWithRetry(() =>
	import("../components/loyalty/LoyaltyStudioModal").then((m) => ({ default: m.LoyaltyStudioModal })),
);
const CashRegisterStudioModal = lazyWithRetry(() =>
	import("../components/cashbox/CashRegisterStudioModal").then((m) => ({ default: m.CashRegisterStudioModal })),
);
const CashShiftClosingModal = lazyWithRetry(() =>
	import("../components/shift/CashShiftClosingModal").then((m) => ({ default: m.CashShiftClosingModal })),
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
			{(routing.isPrescriptionBlankOpen || routing.isPrescriptionForm107Open) && (
				<PrescriptionModal
					isOpen={true}
					onClose={() => {
						routing.setIsPrescriptionBlankOpen?.(false);
						routing.setIsPrescriptionForm107Open?.(false);
					}}
					patient={patient}
					doctorName={doctorName}
					initialSelectedDrugIds={routing.prescriptionInitialMedIds ?? (routing.prescriptionInitialMedId ? [routing.prescriptionInitialMedId] : undefined)}
				/>
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
						patient={{
							id: (patient?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patient.id))
								? patient.id
								: (patient?.id || "00000000-0000-0000-0000-000000000001"),
							fullName: patient?.fullName || "Смирнова Анна Сергеевна",
							cardNumber: patient?.cardNumber || "К-4819",
							phone: patient?.phone || "+7 (926) 412-88-99",
						}}
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
					<LoyaltyStudioModal
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
					<CashRegisterStudioModal
						isOpen={true}
						onClose={() => routing.setIsFastCheckoutDirectOpen(false)}
						mode="checkout"
						initialTab="checkout"
						totalDueRub={appLogic?.effectiveBillingSummary?.totalDueRub ?? routing.fastCheckoutInitialAmountRub ?? 0}
						amountRub={appLogic?.effectiveBillingSummary?.totalDueRub ?? routing.fastCheckoutInitialAmountRub ?? 0}
						amountKopecks={Math.round((appLogic?.effectiveBillingSummary?.totalDueRub ?? routing.fastCheckoutInitialAmountRub ?? 0) * 100)}
						patientId={patient?.id || undefined}
						patientName={patient?.fullName || undefined}
						patientPhone={patient?.phone || undefined}
						patientDepositRub={patient?.depositRub ?? 0}
						patientFamilyBalanceRub={patient?.familyBalanceRub ?? 0}
						cashierFullName={staffUser?.fullName || doctorName}
						clinicLegalName={activeWorkspaceProfile?.title || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						onSuccess={() => routing.setIsFastCheckoutDirectOpen(false)}
						onPaymentComplete={() => routing.setIsFastCheckoutDirectOpen(false)}
					/>
				</Suspense>
			)}
			{routing.isShiftCloseZReportDirectOpen && (
				<Suspense fallback={null}>
					<CashShiftClosingModal
						isOpen={true}
						onClose={() => routing.setIsShiftCloseZReportDirectOpen(false)}
						shiftNumber={routing.shiftNumber ?? 1}
						cashierFullName={staffUser?.fullName || "Кассир"}
						clinicLegalName={activeWorkspaceProfile?.title || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						onShiftClosed={() => routing.setIsShiftCloseZReportDirectOpen(false)}
					/>
				</Suspense>
			)}
			<AppDirectSpecialtyModals routing={routing} sessionAuth={sessionAuth} appLogic={appLogic} />
		</>
	);
}
