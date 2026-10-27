import React from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { PatientDuplicateMergeModal } from "./duplicateMerge/PatientDuplicateMergeModal";
import type { PatientWorkspaceModalsProps } from "./types";
import { PatientClinicalPhotoModals } from "./PatientClinicalPhotoModals";
import { PatientInsuranceAndLoyaltyModals } from "./PatientInsuranceAndLoyaltyModals";

export interface PatientWorkspaceModalsViewProps {
	readonly props: PatientWorkspaceModalsProps;
	readonly effectiveActiveModal: string | null;
	readonly isMergeOpen: boolean;
	readonly closeMergeModal: () => void;
	readonly isFamilyOpen: boolean;
	readonly closeFamilyModal: () => void;
	readonly eventDuplicateData: any;
	readonly isEffectivePhotoProtocolOpen: boolean;
	readonly setInternalPhotoProtocolOpen: (val: boolean) => void;
	readonly isEffectiveOrthoPhotoModalOpen: boolean;
	readonly setInternalOrthoPhotoModalOpen: (val: boolean) => void;
}

export const PatientWorkspaceModalsView: React.FC<PatientWorkspaceModalsViewProps> = ({
	props,
	effectiveActiveModal,
	isMergeOpen,
	closeMergeModal,
	isFamilyOpen,
	closeFamilyModal,
	eventDuplicateData,
	isEffectivePhotoProtocolOpen,
	setInternalPhotoProtocolOpen,
	isEffectiveOrthoPhotoModalOpen,
	setInternalOrthoPhotoModalOpen,
}) => {
	const {
		patientId,
		patientName,
		isCbctModalOpen,
		setIsCbctModalOpen,
		isDmsLetterOpen,
		setIsDmsLetterOpen,
		handleSaveDmsLetter,
		isDmsRegistryOpen,
		setIsDmsRegistryOpen,
		isLoyaltyModalOpen,
		setIsLoyaltyModalOpen,
		doctorName,
		clinicName,
		duplicatePatient,
		onMergeSuccess,
		setIsPhotoProtocolOpen,
		setIsOrthoPhotoModalOpen,
	} = props;

	return (
		<>
			<PatientClinicalPhotoModals
				effectiveActiveModal={effectiveActiveModal}
				isCbctModalOpen={isCbctModalOpen}
				setIsCbctModalOpen={setIsCbctModalOpen}
				patientId={patientId}
				patientName={patientName}
				doctorName={doctorName}
				clinicName={clinicName}
				isEffectivePhotoProtocolOpen={isEffectivePhotoProtocolOpen}
				setInternalPhotoProtocolOpen={setInternalPhotoProtocolOpen}
				setIsPhotoProtocolOpen={setIsPhotoProtocolOpen}
				isEffectiveOrthoPhotoModalOpen={isEffectiveOrthoPhotoModalOpen}
				setInternalOrthoPhotoModalOpen={setInternalOrthoPhotoModalOpen}
				setIsOrthoPhotoModalOpen={setIsOrthoPhotoModalOpen}
			/>

			<PatientInsuranceAndLoyaltyModals
				effectiveActiveModal={effectiveActiveModal}
				patientId={patientId}
				patientName={patientName}
				isDmsLetterOpen={isDmsLetterOpen}
				setIsDmsLetterOpen={setIsDmsLetterOpen}
				handleSaveDmsLetter={handleSaveDmsLetter}
				isDmsRegistryOpen={isDmsRegistryOpen}
				setIsDmsRegistryOpen={setIsDmsRegistryOpen}
				isLoyaltyModalOpen={isLoyaltyModalOpen}
				setIsLoyaltyModalOpen={setIsLoyaltyModalOpen}
				isFamilyOpen={isFamilyOpen}
				closeFamilyModal={closeFamilyModal}
			/>

			{effectiveActiveModal === "duplicate_merge" && isMergeOpen && (
				<PatientDuplicateMergeModal
					isOpen={isMergeOpen}
					onClose={() => {
						closeMergeModal();
						useUiSurfaceStore.getState().closePrimaryModal("duplicate_merge");
					}}
					patientId={patientId}
					patientName={patientName}
					duplicatePatient={duplicatePatient ?? eventDuplicateData}
					onMergeSuccess={onMergeSuccess}
				/>
			)}
		</>
	);
};
