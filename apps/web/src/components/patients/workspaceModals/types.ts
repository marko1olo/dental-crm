import type { DmsGuaranteeLetter } from "../../insurance/DmsGuaranteeLetterModal";

export interface PatientWorkspaceModalsProps {
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly isDmsLetterOpen: boolean;
	readonly setIsDmsLetterOpen: (open: boolean) => void;
	readonly handleSaveDmsLetter: (letter: DmsGuaranteeLetter) => Promise<void>;
	readonly isDmsRegistryOpen: boolean;
	readonly setIsDmsRegistryOpen: (open: boolean) => void;
	readonly isLoyaltyModalOpen: boolean;
	readonly setIsLoyaltyModalOpen: (open: boolean) => void;
	readonly isCbctModalOpen: boolean;
	readonly setIsCbctModalOpen: (open: boolean) => void;
	readonly isPhotoProtocolOpen?: boolean | undefined;
	readonly setIsPhotoProtocolOpen?: ((open: boolean) => void) | undefined;
	readonly isOrthoPhotoModalOpen?: boolean | undefined;
	readonly setIsOrthoPhotoModalOpen?: ((open: boolean) => void) | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly isMergeModalOpen?: boolean | undefined;
	readonly setIsMergeModalOpen?: ((open: boolean) => void) | undefined;
	readonly isFamilyWalletOpen?: boolean | undefined;
	readonly setIsFamilyWalletOpen?: ((open: boolean) => void) | undefined;
	readonly duplicatePatient?: any;
	readonly onMergeSuccess?: ((result: any) => void) | undefined;
}
