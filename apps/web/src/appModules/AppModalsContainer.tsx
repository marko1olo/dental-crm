/**
 * DENTE Dental CRM — Application Modals Container (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import { AppModalsContainer as BaseAppModalsContainer } from "../components/appLayout";
import { AppDirectModals } from "./AppDirectModals";
import type { AppHashRoutingState, AppSessionAuthState } from "./appStateTypes";

interface AppModalsContainerProps {
	routing: AppHashRoutingState;
	sessionAuth: AppSessionAuthState;
	appLogic: any;
}

export function AppModalsContainer({ routing, sessionAuth, appLogic }: AppModalsContainerProps) {
	return (
		<>
			<BaseAppModalsContainer
				isCbctTunerOpen={routing.isCbctTunerOpen}
				setIsCbctTunerOpen={routing.setIsCbctTunerOpen}
				isCbctDirectModalOpen={routing.isCbctDirectModalOpen}
				setIsCbctDirectModalOpen={routing.setIsCbctDirectModalOpen}
				isConsentDirectModalOpen={routing.isConsentDirectModalOpen}
				setIsConsentDirectModalOpen={routing.setIsConsentDirectModalOpen}
				isCephDirectModalOpen={routing.isCephDirectModalOpen}
				setIsCephDirectModalOpen={routing.setIsCephDirectModalOpen}
				isEgiszRemdModalOpen={routing.isEgiszRemdModalOpen}
				setIsEgiszRemdModalOpen={routing.setIsEgiszRemdModalOpen}
				isSmartSlotRecoveryDemoOpen={routing.isSmartSlotRecoveryDemoOpen}
				setIsSmartSlotRecoveryDemoOpen={routing.setIsSmartSlotRecoveryDemoOpen}
				isPrivacyShieldActive={sessionAuth.isPrivacyShieldActive}
				setIsPrivacyShieldActive={sessionAuth.setIsPrivacyShieldActive}
				isSessionLocked={sessionAuth.isSessionLocked}
				setIsSessionLocked={sessionAuth.setIsSessionLocked}
				activeStaffUser={sessionAuth.activeStaffUser}
				setActiveStaffUser={sessionAuth.setActiveStaffUser}
				handleClinicLogout={sessionAuth.handleClinicLogout}
				handleFullStaffLock={sessionAuth.handleFullStaffLock}
			/>
			<AppDirectModals routing={routing} sessionAuth={sessionAuth} appLogic={appLogic} />
		</>
	);
}
