/**
 * AppModalsContainer — Главный фасад модальных окон CRM (Мандат 8b, <= 120 строк).
 * Декомпозирован в подмодули apps/web/src/components/appLayout/modalsContainerModules/
 */

import React from "react";
import type { AppModalsContainerProps } from "./types";
import { type StandaloneLaunchersProps, type LoyaltyModalContext } from "./modalsContainerModules/modalsContainerTypes";
import { renderStandaloneLaunchers } from "./modalsContainerModules/StandaloneLaunchers";
import { ClinicalModalsSubcontainer } from "./modalsContainerModules/ClinicalModalsSubcontainer";
import { AdministrativeModalsSubcontainer } from "./modalsContainerModules/AdministrativeModalsSubcontainer";
import { GlobalSupportModals } from "./modalsContainerModules/GlobalSupportModals";
import { useAppModalsEventBridge } from "./modalsContainerModules/useAppModalsEventBridge";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { DoctorPayrollStudioModal } from "../payroll/DoctorPayrollStudioModal";
import { DentalLabStudioModal, type DentalLabStudioModalProps } from "../lab/DentalLabStudioModal";
import { DicomViewerModal } from "../imaging/DicomViewerModal";

export type { StandaloneLaunchersProps };
export { renderStandaloneLaunchers };

export function AppModalsContainer(props: AppModalsContainerProps) {
	const bridge = useAppModalsEventBridge();
	const primaryModal = useUiSurfaceStore((s) => s.primaryModal);
	const isLoyaltyFromStore = primaryModal?.id === "loyalty";
	const isEffectiveLoyaltyOpen = Boolean(bridge.isGlobalLoyaltyOpen || isLoyaltyFromStore);
	const loyaltyPayload =
		isLoyaltyFromStore && primaryModal?.payload && typeof primaryModal.payload === "object"
			? (primaryModal.payload as LoyaltyModalContext)
			: null;
	const effectiveLoyaltyContext = loyaltyPayload || bridge.loyaltyModalContext;
	const isEmergencyFromStore = primaryModal?.id === "emergency_rescue";
	const isEffectiveEmergencyOpen = Boolean(bridge.isEmergencyRescueOpen || isEmergencyFromStore);
	const isPayrollFromStore = primaryModal?.id === "doctor_payroll" || primaryModal?.id === "payroll";
	const isLabFromStore = primaryModal?.id === "lab_order" || primaryModal?.id === "dental_lab" || primaryModal?.id === "lab" || primaryModal?.id === "lab_hub";
	const isDicomFromStore = primaryModal?.id === "dicom_viewer";

	return (
		<>
			{renderStandaloneLaunchers(props)}

			{isDicomFromStore && (
				<DicomViewerModal
					isOpen={true}
					onClose={() => useUiSurfaceStore.getState().closePrimaryModal("dicom_viewer")}
					{...((primaryModal?.payload as Record<string, unknown> | undefined) || {})}
				/>
			)}

			{isPayrollFromStore && (
				<DoctorPayrollStudioModal
					isOpen={true}
					onClose={() => useUiSurfaceStore.getState().closePrimaryModal(primaryModal.id)}
				/>
			)}

			{isLabFromStore && (
				<DentalLabStudioModal
					isOpen={true}
					onClose={() => useUiSurfaceStore.getState().closePrimaryModal(primaryModal.id)}
					{...(primaryModal?.payload && typeof primaryModal.payload === "object"
						? (primaryModal.payload as Partial<DentalLabStudioModalProps>)
						: {})}
				/>
			)}

			<ClinicalModalsSubcontainer
				isGlobalVisiographOpen={bridge.isGlobalVisiographOpen}
				setIsGlobalVisiographOpen={bridge.setIsGlobalVisiographOpen}
				isGlobalImagingExportOpen={bridge.isGlobalImagingExportOpen}
				setIsGlobalImagingExportOpen={bridge.setIsGlobalImagingExportOpen}
				isCbctTunerOpen={props.isCbctTunerOpen}
				setIsCbctTunerOpen={props.setIsCbctTunerOpen}
				isCbctDirectModalOpen={props.isCbctDirectModalOpen}
				setIsCbctDirectModalOpen={props.setIsCbctDirectModalOpen}
				isConsentDirectModalOpen={props.isConsentDirectModalOpen}
				setIsConsentDirectModalOpen={props.setIsConsentDirectModalOpen}
				isEgiszRemdModalOpen={props.isEgiszRemdModalOpen}
				setIsEgiszRemdModalOpen={props.setIsEgiszRemdModalOpen}
				activeStaffUser={props.activeStaffUser}
			/>

			<AdministrativeModalsSubcontainer
				isGlobalLabCreateOrderOpen={bridge.isGlobalLabCreateOrderOpen}
				setIsGlobalLabCreateOrderOpen={bridge.setIsGlobalLabCreateOrderOpen}
				labCreateOrderContext={bridge.labCreateOrderContext}
				isGlobalLoyaltyOpen={isEffectiveLoyaltyOpen}
				setIsGlobalLoyaltyOpen={(open) => {
					bridge.setIsGlobalLoyaltyOpen(open);
					if (!open) useUiSurfaceStore.getState().closePrimaryModal("loyalty");
				}}
				loyaltyModalContext={effectiveLoyaltyContext}
				isSessionLocked={props.isSessionLocked}
				setIsSessionLocked={props.setIsSessionLocked}
				activeStaffUser={props.activeStaffUser}
				setActiveStaffUser={props.setActiveStaffUser}
				handleClinicLogout={props.handleClinicLogout}
				handleFullStaffLock={props.handleFullStaffLock}
			/>

			<GlobalSupportModals
				isEgiszCertificatesOpen={bridge.isEgiszCertificatesOpen}
				setIsEgiszCertificatesOpen={bridge.setIsEgiszCertificatesOpen}
				egiszCertificatesSection={bridge.egiszCertificatesSection}
				isGlobalOnboardingOpen={bridge.isGlobalOnboardingOpen}
				setIsGlobalOnboardingOpen={bridge.setIsGlobalOnboardingOpen}
				isEmergencyRescueOpen={isEffectiveEmergencyOpen}
				setIsEmergencyRescueOpen={(open) => {
					bridge.setIsEmergencyRescueOpen(open);
					if (!open) useUiSurfaceStore.getState().closePrimaryModal("emergency_rescue");
				}}
			/>

		</>
	);
}
