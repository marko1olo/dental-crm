import type { Dispatch, SetStateAction } from "react";
import type { StaffUser } from "../../auth/staffPinPad/staffPinPadTypes";
import type { AppModalsContainerProps } from "../types";

export interface StandaloneLaunchersProps {
	isCbctTunerOpen: boolean;
	setIsCbctTunerOpen: (open: boolean) => void;
	isCbctDirectModalOpen: boolean;
	setIsCbctDirectModalOpen: (open: boolean) => void;
	isConsentDirectModalOpen: boolean;
	setIsConsentDirectModalOpen: (open: boolean) => void;
	isCephDirectModalOpen: boolean;
	setIsCephDirectModalOpen: (open: boolean) => void;
	isEgiszRemdModalOpen: boolean;
	setIsEgiszRemdModalOpen: (open: boolean) => void;
	isSmartOpgDirectModalOpen?: boolean;
	setIsSmartOpgDirectModalOpen?: (open: boolean) => void;
	isCtSelectorDirectModalOpen?: boolean;
	setIsCtSelectorDirectModalOpen?: (open: boolean) => void;
	isVisiographDirectModalOpen?: boolean;
	setIsVisiographDirectModalOpen?: (open: boolean) => void;
	isImagingExportDirectModalOpen?: boolean;
	setIsImagingExportDirectModalOpen?: (open: boolean) => void;
	isLabCreateOrderDirectModalOpen?: boolean;
	setIsLabCreateOrderDirectModalOpen?: (open: boolean) => void;
	isDmsDirectModalOpen?: boolean;
	setIsDmsDirectModalOpen?: (open: boolean) => void;
	isPlanScenariosDirectModalOpen?: boolean;
	setIsPlanScenariosDirectModalOpen?: (open: boolean) => void;
	isCasePresenterDirectModalOpen?: boolean;
	setIsCasePresenterDirectModalOpen?: (open: boolean) => void;
	isSbpDirectModalOpen?: boolean;
	setIsSbpDirectModalOpen?: (open: boolean) => void;
	isReceiptDirectModalOpen?: boolean;
	setIsReceiptDirectModalOpen?: (open: boolean) => void;
	isEmergencyDirectModalOpen?: boolean;
	setIsEmergencyDirectModalOpen?: (open: boolean) => void;
}

export interface LabCreateOrderContext {
	patientName?: string;
	patientId?: string;
	toothNumber?: string;
	treatmentPlanId?: string;
	stageNumber?: number;
	stageTitle?: string;
	initialTeeth?: number[];
}

export interface ClinicalModalsSubcontainerProps {
	isGlobalVisiographOpen: boolean;
	setIsGlobalVisiographOpen: (open: boolean) => void;
	isGlobalImagingExportOpen: boolean;
	setIsGlobalImagingExportOpen: (open: boolean) => void;
	isCbctTunerOpen: boolean;
	setIsCbctTunerOpen: Dispatch<SetStateAction<boolean>>;
	isCbctDirectModalOpen: boolean;
	setIsCbctDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isConsentDirectModalOpen: boolean;
	setIsConsentDirectModalOpen: Dispatch<SetStateAction<boolean>>;
	isEgiszRemdModalOpen: boolean;
	setIsEgiszRemdModalOpen: Dispatch<SetStateAction<boolean>>;
	activeStaffUser?: StaffUser | null | undefined;
}

export interface LoyaltyModalContext {
	patientName?: string | undefined;
	patientId?: string | undefined;
	initialPointsBalance?: number | undefined;
	currentInvoiceAmountKop?: number | undefined;
	medicalCardNumber?: string | undefined;
}

export interface AdministrativeModalsSubcontainerProps {
	isGlobalLabCreateOrderOpen: boolean;
	setIsGlobalLabCreateOrderOpen: (open: boolean) => void;
	labCreateOrderContext: LabCreateOrderContext | null;
	isGlobalLoyaltyOpen?: boolean | undefined;
	setIsGlobalLoyaltyOpen?: ((open: boolean) => void) | undefined;
	loyaltyModalContext?: LoyaltyModalContext | null | undefined;
	isSessionLocked?: boolean | undefined;
	setIsSessionLocked?: Dispatch<SetStateAction<boolean>> | undefined;
	activeStaffUser?: StaffUser | null | undefined;
	setActiveStaffUser: Dispatch<SetStateAction<StaffUser | null>>;
	handleClinicLogout: () => void;
	handleFullStaffLock: () => void;
}
