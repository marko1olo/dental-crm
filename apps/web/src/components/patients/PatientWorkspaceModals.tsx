import React from "react";
import { PatientWorkspaceModalsView } from "./workspaceModals/PatientWorkspaceModalsView";
import type { PatientWorkspaceModalsProps } from "./workspaceModals/types";
import { usePatientWorkspaceModalsLogic } from "./workspaceModals/usePatientWorkspaceModalsLogic";

export * from "./workspaceModals/duplicateMerge/PatientDuplicateMergeModal";
export * from "./workspaceModals/duplicateMerge/types";
export * from "./workspaceModals/PatientWorkspaceModalsView";
export * from "./workspaceModals/types";
export * from "./workspaceModals/usePatientWorkspaceModalsLogic";

export const PatientWorkspaceModals: React.FC<PatientWorkspaceModalsProps> =
	React.memo(function PatientWorkspaceModals(props) {
		const {
			effectiveActiveModal,
			isMergeOpen,
			closeMergeModal,
			eventDuplicateData,
			isEffectivePhotoProtocolOpen,
			setInternalPhotoProtocolOpen,
			isEffectiveOrthoPhotoModalOpen,
			setInternalOrthoPhotoModalOpen,
			isFamilyOpen,
			closeFamilyModal,
		} = usePatientWorkspaceModalsLogic(props);

		return (
			<PatientWorkspaceModalsView
				props={props}
				effectiveActiveModal={effectiveActiveModal}
				isMergeOpen={isMergeOpen}
				closeMergeModal={closeMergeModal}
				isFamilyOpen={isFamilyOpen}
				closeFamilyModal={closeFamilyModal}
				eventDuplicateData={eventDuplicateData}
				isEffectivePhotoProtocolOpen={isEffectivePhotoProtocolOpen}
				setInternalPhotoProtocolOpen={setInternalPhotoProtocolOpen}
				isEffectiveOrthoPhotoModalOpen={isEffectiveOrthoPhotoModalOpen}
				setInternalOrthoPhotoModalOpen={setInternalOrthoPhotoModalOpen}
			/>
		);
	});

PatientWorkspaceModals.displayName = "PatientWorkspaceModals";
