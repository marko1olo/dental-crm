import React from "react";
import { DentalLabCreateOrderModal } from "../../lab/DentalLabCreateOrderModal";
import { DoctorPrivacyShield } from "../../auth/DoctorPrivacyShield";
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
			{isGlobalLabCreateOrderOpen && (
				<DentalLabCreateOrderModal
					isOpen={isGlobalLabCreateOrderOpen}
					onClose={() => setIsGlobalLabCreateOrderOpen(false)}
					onCreateOrder={() => setIsGlobalLabCreateOrderOpen(false)}
					currentPatientName={
						labCreateOrderContext?.patientName || "Пациент"
					}
					currentPatientId={labCreateOrderContext?.patientId || ""}
					currentDoctorName={
						activeStaffUser?.name ||
						activeStaffUser?.fullName ||
						"Лечащий врач"
					}
					currentToothNumber={labCreateOrderContext?.toothNumber || "21"}
					treatmentPlanId={labCreateOrderContext?.treatmentPlanId}
					stageNumber={labCreateOrderContext?.stageNumber ?? 2}
					stageTitle={
						labCreateOrderContext?.stageTitle ||
						"Ортопедический этап: безметалловая керамика"
					}
					initialTeeth={labCreateOrderContext?.initialTeeth || [21, 22]}
				/>
			)}
			{isGlobalLoyaltyOpen && (
				<React.Suspense fallback={null}>
					<LoyaltyProgramModal
						isOpen={isGlobalLoyaltyOpen}
						onClose={() => setIsGlobalLoyaltyOpen?.(false)}
						patientId={loyaltyModalContext?.patientId || "01a00000-0000-0000-0000-000000000001"}
						patientName={loyaltyModalContext?.patientName || "Смирнова Анна Сергеевна"}
						initialPointsBalance={loyaltyModalContext?.initialPointsBalance}
						currentInvoiceAmountKop={loyaltyModalContext?.currentInvoiceAmountKop}
						medicalCardNumber={loyaltyModalContext?.medicalCardNumber || "№ 01A00001"}
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
