import type { Dispatch, SetStateAction } from "react";

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
	activeStaffUser: any;
	setActiveStaffUser: Dispatch<SetStateAction<any>>;
	handleClinicLogout: () => void;
	handleFullStaffLock: () => void;
}
