/**
 * DENTE Dental CRM — Application Root State Types (Layer 0)
 * Mandate 8b (Architecture Decomposition), Mandate 8e (Doctor Autonomy).
 */

import type { Dispatch, SetStateAction } from "react";

export interface ImplantPassportConfig {
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	doctorId?: string;
	toothNumber?: number;
}

export interface AppHashRoutingState {
	isPrescriptionForm107Open: boolean;
	setIsPrescriptionForm107Open: Dispatch<SetStateAction<boolean>>;
	prescriptionInitialMedId: string | null;
	prescriptionInitialMedIds: string[] | null;
	isImplantPassportDirectOpen: boolean;
	setIsImplantPassportDirectOpen: Dispatch<SetStateAction<boolean>>;
	implantPassportConfig: ImplantPassportConfig | null;
	setImplantPassportConfig: Dispatch<SetStateAction<ImplantPassportConfig | null>>;
	isRecallsHubOpen: boolean;
	setIsRecallsHubOpen: Dispatch<SetStateAction<boolean>>;
	isLoyaltyProgramOpen: boolean;
	setIsLoyaltyProgramOpen: Dispatch<SetStateAction<boolean>>;
	isFastCheckoutDirectOpen: boolean;
	setIsFastCheckoutDirectOpen: Dispatch<SetStateAction<boolean>>;
	isOrthoPhotoDirectModalOpen: boolean;
	setIsOrthoPhotoDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isOrthoProtocolDirectModalOpen: boolean;
	setIsOrthoProtocolDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isToothDrawerDirectModalOpen: boolean;
	setIsToothDrawerDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isClinicalTasksOpen: boolean;
	setIsClinicalTasksOpen: Dispatch<SetStateAction<boolean>>;
	clinicalTasksPatientId: string | null;
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
	isSmartOpgDirectModalOpen: boolean;
	setIsSmartOpgDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isCtSelectorDirectModalOpen: boolean;
	setIsCtSelectorDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isVisiographDirectModalOpen: boolean;
	setIsVisiographDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isImagingExportDirectModalOpen: boolean;
	setIsImagingExportDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isLabCreateOrderDirectModalOpen: boolean;
	setIsLabCreateOrderDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isDmsDirectModalOpen: boolean;
	setIsDmsDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isPlanScenariosDirectModalOpen: boolean;
	setIsPlanScenariosDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isCasePresenterDirectModalOpen: boolean;
	setIsCasePresenterDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isSbpDirectModalOpen: boolean;
	setIsSbpDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isReceiptDirectModalOpen: boolean;
	setIsReceiptDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isEmergencyDirectModalOpen: boolean;
	setIsEmergencyDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isWarrantyPassportOpen: boolean;
	setIsWarrantyPassportOpen: Dispatch<SetStateAction<boolean>>;
	isShiftCloseZReportDirectOpen: boolean;
	setIsShiftCloseZReportDirectOpen: Dispatch<SetStateAction<boolean>>;
}

export interface AppSessionAuthState {
	clinicAuthed: boolean;
	setClinicAuthed: Dispatch<SetStateAction<boolean>>;
	staffAuthed: boolean;
	setStaffAuthed: Dispatch<SetStateAction<boolean>>;
	activeStaffUser: any;
	setActiveStaffUser: Dispatch<SetStateAction<any>>;
	showStaffPinPad: boolean;
	setShowStaffPinPad: Dispatch<SetStateAction<boolean>>;
	isSessionLocked: boolean;
	setIsSessionLocked: Dispatch<SetStateAction<boolean>>;
	isPrivacyShieldActive: boolean;
	setIsPrivacyShieldActive: Dispatch<SetStateAction<boolean>>;
	handleLockSession: () => void;
	handleClinicLogout: () => void;
	handleFullStaffLock: () => void;
}
