import type { Dispatch, SetStateAction } from "react";
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
	activeStaffUser: any;
}

export interface LoyaltyModalContext {
	patientName?: string;
	patientId?: string;
	initialPointsBalance?: number;
	currentInvoiceAmountKop?: number;
	medicalCardNumber?: string;
}

export interface AdministrativeModalsSubcontainerProps {
	isGlobalLabCreateOrderOpen: boolean;
	setIsGlobalLabCreateOrderOpen: (open: boolean) => void;
	labCreateOrderContext: LabCreateOrderContext | null;
	isGlobalLoyaltyOpen?: boolean;
	setIsGlobalLoyaltyOpen?: (open: boolean) => void;
	loyaltyModalContext?: LoyaltyModalContext | null;
	isSessionLocked?: boolean | undefined;
	setIsSessionLocked?: Dispatch<SetStateAction<boolean>> | undefined;
	activeStaffUser: any;
	setActiveStaffUser: Dispatch<SetStateAction<any>>;
	handleClinicLogout: () => void;
	handleFullStaffLock: () => void;
}
