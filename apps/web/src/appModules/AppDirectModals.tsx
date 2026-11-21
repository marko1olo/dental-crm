/**
 * DENTE Dental CRM — Direct Clinical Modals (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React, { Suspense } from "react";
import { isDemoShowcaseMode } from "../lib/demoMode";
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

import type { SpecialtyModalsAppLogic } from "./AppDirectSpecialtyModals";

export interface AppDirectModalsAppLogic extends SpecialtyModalsAppLogic {
	readonly activeWorkspaceProfile?: { title?: string } | null | undefined;
	readonly effectiveBillingSummary?: { totalDueRub?: number } | null | undefined;
	readonly activePatient?: (NonNullable<SpecialtyModalsAppLogic["activePatient"]> & {
		phone?: string | null;
		snils?: string | null;
		depositRub?: number;
		familyBalanceRub?: number;
	}) | null | undefined;
	readonly activeVisitPatient?: (NonNullable<SpecialtyModalsAppLogic["activeVisitPatient"]> & {
		phone?: string | null;
		snils?: string | null;
		depositRub?: number;
		familyBalanceRub?: number;
	}) | null | undefined;
}

interface AppDirectModalsProps {
	routing: AppHashRoutingState;
	sessionAuth: AppSessionAuthState;
	appLogic: AppDirectModalsAppLogic;
}

export function AppDirectModals({ routing, sessionAuth, appLogic }: AppDirectModalsProps) {
	const { activePatient, activeVisitPatient, activeDoctor, activeWorkspaceProfile } = appLogic;
	const staffUser = sessionAuth.activeStaffUser;
	const patient = activePatient || activeVisitPatient;
	const activeDoctorId = staffUser?.id || activeDoctor?.id || undefined;
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
					patient={patient ? {
						id: patient.id,
						fullName: patient.fullName || patient.name,
						birthDate: patient.birthDate || undefined,
						cardNumber: patient.cardNumber,
						snils: patient.snils || undefined,
					} : undefined}
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
						patient={patient ? {
							id: patient.id,
							fullName: patient.fullName,
							cardNumber: patient.cardNumber,
							phone: patient.phone,
							birthDate: patient.birthDate,
							snils: patient.snils,
						} : (isDemoShowcaseMode() ? {
							id: "01a00000-0000-0000-0000-000000000001",
							fullName: "Ковалев Дмитрий Сергеевич",
							cardNumber: "МК-8492",
							phone: "+7 (912) 345-67-89",
							birthDate: "1985-06-12",
							snils: undefined,
						} : undefined)}
						doctorId={activeDoctorId}
						doctorName={doctorName}
						clinicName={activeWorkspaceProfile?.title || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						completedStages={undefined}
					/>
				</Suspense>
			)}
			{routing.isLoyaltyProgramOpen && (
				<Suspense fallback={null}>
					<LoyaltyStudioModal
						isOpen={true}
						onClose={() => routing.setIsLoyaltyProgramOpen(false)}
						patientId={patient?.id || (isDemoShowcaseMode() ? "pat-demo-01" : undefined)}
						patientName={patient?.fullName || (isDemoShowcaseMode() ? "Воронова Светлана Николаевна" : undefined)}
						medicalCardNumber={patient?.cardNumber || (isDemoShowcaseMode() ? "№ 4821-Л" : undefined)}
						clinicName={activeWorkspaceProfile?.title || "ООО «Денте Стоматология»"}
						initialPointsBalance={isDemoShowcaseMode() ? 1500 : 0}
						initialLifetimeSpentKop={isDemoShowcaseMode() ? 4500000 : 0}
						currentInvoiceAmountKop={isDemoShowcaseMode() ? 350000 : 0}
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
