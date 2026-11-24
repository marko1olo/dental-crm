import React from "react";
import { DoctorPrivacyShield } from "../../auth/DoctorPrivacyShield";
import { safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";
import type { StaffUser } from "../../auth/staffPinPad/staffPinPadTypes";
import type { AdministrativeModalsSubcontainerProps } from "./modalsContainerTypes";

const LoyaltyStudioModal = React.lazy(() =>
	import("../../loyalty/LoyaltyStudioModal").then((m) => ({
		default: m.LoyaltyStudioModal,
	})),
);

export function AdministrativeModalsSubcontainer({
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
			{/* Честность: бонусы списываются только конкретному пациенту из контекста.
			    Без patientId модалка не открывается — никаких подставных карт и ФИО. */}
			{isGlobalLoyaltyOpen && loyaltyModalContext?.patientId && (
				<React.Suspense fallback={null}>
					<LoyaltyStudioModal
						isOpen={isGlobalLoyaltyOpen}
						onClose={() => setIsGlobalLoyaltyOpen?.(false)}
						patientId={loyaltyModalContext.patientId}
						patientName={loyaltyModalContext.patientName || "Пациент"}
						initialPointsBalance={loyaltyModalContext.initialPointsBalance ?? 0}
						currentInvoiceAmountKop={loyaltyModalContext.currentInvoiceAmountKop ?? 0}
						medicalCardNumber={loyaltyModalContext.medicalCardNumber || ""}
					/>
				</React.Suspense>
			)}
			<DoctorPrivacyShield
				isOpen={Boolean(isSessionLocked)}
				doctor={activeStaffUser}
				onUnlock={(unlockedUser) => {
					if (unlockedUser && typeof unlockedUser === "object") {
						setActiveStaffUser(unlockedUser as StaffUser);
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
