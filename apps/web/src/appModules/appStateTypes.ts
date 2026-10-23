/**
 * DENTE Dental CRM — Application Root State Types (Layer 0)
 * Mandate 8b (Architecture Decomposition), Mandate 8e (Doctor Autonomy).
 */

export interface ImplantPassportConfig {
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	doctorId?: string;
	toothNumber?: number;
}

export interface AppHashRoutingState {
	isPrescriptionForm107Open: boolean;
	setIsPrescriptionForm107Open: (v: boolean) => void;
	prescriptionInitialMedId: string | null;
	prescriptionInitialMedIds: string[] | null;
	isImplantPassportDirectOpen: boolean;
	setIsImplantPassportDirectOpen: (v: boolean) => void;
	implantPassportConfig: ImplantPassportConfig | null;
	setImplantPassportConfig: (v: ImplantPassportConfig | null) => void;
	isRecallsHubOpen: boolean;
	setIsRecallsHubOpen: (v: boolean) => void;
	isOrthoPhotoDirectModalOpen: boolean;
	setIsOrthoPhotoDirectModalOpen: (v: boolean) => void;
	isOrthoProtocolDirectModalOpen: boolean;
	setIsOrthoProtocolDirectModalOpen: (v: boolean) => void;
	isToothDrawerDirectModalOpen: boolean;
	setIsToothDrawerDirectModalOpen: (v: boolean) => void;
	isClinicalTasksOpen: boolean;
	setIsClinicalTasksOpen: (v: boolean) => void;
	clinicalTasksPatientId: string | null;
	isCbctTunerOpen: boolean;
	setIsCbctTunerOpen: (v: boolean) => void;
	isCbctDirectModalOpen: boolean;
	setIsCbctDirectModalOpen: (v: boolean) => void;
	isConsentDirectModalOpen: boolean;
	setIsConsentDirectModalOpen: (v: boolean) => void;
	isCephDirectModalOpen: boolean;
	setIsCephDirectModalOpen: (v: boolean) => void;
	isEgiszRemdModalOpen: boolean;
	setIsEgiszRemdModalOpen: (v: boolean) => void;
	isSmartSlotRecoveryDemoOpen: boolean;
	setIsSmartSlotRecoveryDemoOpen: (v: boolean) => void;
	isSmartOpgDirectModalOpen: boolean;
	setIsSmartOpgDirectModalOpen: (v: boolean) => void;
	isCtSelectorDirectModalOpen: boolean;
	setIsCtSelectorDirectModalOpen: (v: boolean) => void;
	isVisiographDirectModalOpen: boolean;
	setIsVisiographDirectModalOpen: (v: boolean) => void;
	isImagingExportDirectModalOpen: boolean;
	setIsImagingExportDirectModalOpen: (v: boolean) => void;
	isLabCreateOrderDirectModalOpen: boolean;
	setIsLabCreateOrderDirectModalOpen: (v: boolean) => void;
	isDmsDirectModalOpen: boolean;
	setIsDmsDirectModalOpen: (v: boolean) => void;
	isPlanScenariosDirectModalOpen: boolean;
	setIsPlanScenariosDirectModalOpen: (v: boolean) => void;
	isCasePresenterDirectModalOpen: boolean;
	setIsCasePresenterDirectModalOpen: (v: boolean) => void;
	isSbpDirectModalOpen: boolean;
	setIsSbpDirectModalOpen: (v: boolean) => void;
	isReceiptDirectModalOpen: boolean;
	setIsReceiptDirectModalOpen: (v: boolean) => void;
	isEmergencyDirectModalOpen: boolean;
	setIsEmergencyDirectModalOpen: (v: boolean) => void;
	isWarrantyPassportOpen: boolean;
	setIsWarrantyPassportOpen: (v: boolean) => void;
}

export interface AppSessionAuthState {
	clinicAuthed: boolean;
	setClinicAuthed: (v: boolean) => void;
	staffAuthed: boolean;
	setStaffAuthed: (v: boolean) => void;
	activeStaffUser: any;
	setActiveStaffUser: (u: any) => void;
	showStaffPinPad: boolean;
	setShowStaffPinPad: (v: boolean) => void;
	isSessionLocked: boolean;
	setIsSessionLocked: (v: boolean) => void;
	isPrivacyShieldActive: boolean;
	setIsPrivacyShieldActive: (v: boolean) => void;
	handleLockSession: () => void;
	handleClinicLogout: () => void;
	handleFullStaffLock: () => void;
}
