import type { Dispatch, SetStateAction } from "react";
import type { StaffUser } from "../../auth/staffPinPad/staffPinPadTypes";

export interface AppModalsContainerProps {
	isCbctTunerOpen: boolean;
	setIsCbctTunerOpen: Dispatch<SetStateAction<boolean>>;
	isCbctDirectModalOpen: boolean;
	setIsCbctDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isConsentDirectModalOpen: boolean;
	setIsConsentDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isCephDirectModalOpen: boolean;
	setIsCephDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isEgiszRemdModalOpen: boolean;
	setIsEgiszRemdModalOpen: Dispatch<SetStateAction<boolean>>;
	isPrivacyShieldActive: boolean;
	setIsPrivacyShieldActive: Dispatch<SetStateAction<boolean>>;
	isSessionLocked?: boolean;
	setIsSessionLocked?: Dispatch<SetStateAction<boolean>>;
	activeStaffUser?: StaffUser | null;
	setActiveStaffUser: Dispatch<SetStateAction<StaffUser | null>>;
	handleClinicLogout: () => void;
	handleFullStaffLock: () => void;
}
