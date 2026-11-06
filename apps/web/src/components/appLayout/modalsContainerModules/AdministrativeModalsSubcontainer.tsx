import React from "react";
import { DentalLabStudioModal } from "../../lab/DentalLabStudioModal";
import { DoctorPrivacyShield } from "../../auth/DoctorPrivacyShield";
import { GlobalPaymentModalLauncher } from "../../billing/GlobalPaymentModalLauncher";
import { safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";
import type { AdministrativeModalsSubcontainerProps } from "./modalsContainerTypes";

const LoyaltyProgramModal = React.lazy(() =>
	import("../../loyalty/program/LoyaltyProgramModal").then((m) => ({
		default: m.LoyaltyProgramModal,
	})),
);

export function AdministrativeModalsSubcontainer({
	isGlobalLabCreateOrderOpen,
	setIsGlobalLabCreateOrderOpen,
	labCreateOrderContext,
	isGlobalLoyaltyOpen,
	setIsGlobalLoyaltyOpen,
	loyaltyModalContext,
	isSessionLocked,
	setIsSessionLocked,
	activeStaffUser,
	setActiveStaffUser,
	handleClinicLogout,
	handleFullStaffLock,
}: AdministrativeModalsSubcontainerProps) {
	return (
		<>
			<GlobalPaymentModalLauncher activeStaffUser={activeStaffUser} />
			{isGlobalLabCreateOrderOpen && (
				<DentalLabStudioModal
					isOpen={isGlobalLabCreateOrderOpen}
					onClose={() => setIsGlobalLabCreateOrderOpen(false)}
					onOrderCreated={() => setIsGlobalLabCreateOrderOpen(false)}
					patientName={
						labCreateOrderContext?.patientName || "Пациент"
					}
					patientId={labCreateOrderContext?.patientId || ""}
					doctorName={
						activeStaffUser?.name ||
						activeStaffUser?.fullName ||
						"Лечащий врач"
					}
					initialToothFdi={labCreateOrderContext?.toothNumber || "21"}
				/>
			)}
			{/* Честность: бонусы списываются только конкретному пациенту из контекста.
			    Без patientId модалка не открывается — никаких подставных карт и ФИО. */}
			{isGlobalLoyaltyOpen && loyaltyModalContext?.patientId && (
				<React.Suspense fallback={null}>
					<LoyaltyProgramModal
						isOpen={isGlobalLoyaltyOpen}
						onClose={() => setIsGlobalLoyaltyOpen?.(false)}
						patientId={loyaltyModalContext.patientId}
						patientName={loyaltyModalContext.patientName || "Пациент"}
						initialPointsBalance={loyaltyModalContext.initialPointsBalance}
						currentInvoiceAmountKop={loyaltyModalContext.currentInvoiceAmountKop}
						medicalCardNumber={loyaltyModalContext.medicalCardNumber || ""}
					/>
				</React.Suspense>
			)}
			<DoctorPrivacyShield
				isOpen={Boolean(isSessionLocked)}
				doctor={activeStaffUser}
				onUnlock={(unlockedUser) => {
					if (unlockedUser) {
						setActiveStaffUser(unlockedUser);
					}
					setIsSessionLocked?.(false);
					safeLocalStorageRemoveItem("dente_session_locked");
				}}
				onClinicLogout={handleClinicLogout}
				onFullLock={handleFullStaffLock}
			/>
		</>
	);
}
