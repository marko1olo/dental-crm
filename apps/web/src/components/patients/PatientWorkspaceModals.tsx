import React from "react";
import type { PatientWorkspaceModalsProps } from "./workspaceModals/types";
import { usePatientWorkspaceModalsLogic } from "./workspaceModals/usePatientWorkspaceModalsLogic";
import { PatientWorkspaceModalsView } from "./workspaceModals/PatientWorkspaceModalsView";

export * from "./workspaceModals/types";
export * from "./workspaceModals/duplicateMerge/types";
export * from "./workspaceModals/duplicateMerge/PatientDuplicateMergeModal";
export * from "./workspaceModals/usePatientWorkspaceModalsLogic";
export * from "./workspaceModals/PatientWorkspaceModalsView";

export const PatientWorkspaceModals: React.FC<PatientWorkspaceModalsProps> = React.memo(
	function PatientWorkspaceModals(props) {
		const {
			effectiveActiveModal,
			isMergeOpen,
			closeMergeModal,
			eventDuplicateData,
			isEffectivePhotoProtocolOpen,
			setInternalPhotoProtocolOpen,
			isEffectiveOrthoPhotoModalOpen,
			setInternalOrthoPhotoModalOpen,
		} = usePatientWorkspaceModalsLogic(props);

		return (
			<PatientWorkspaceModalsView
				props={props}
				effectiveActiveModal={effectiveActiveModal}
				isMergeOpen={isMergeOpen}
				closeMergeModal={closeMergeModal}
				eventDuplicateData={eventDuplicateData}
				isEffectivePhotoProtocolOpen={isEffectivePhotoProtocolOpen}
				setInternalPhotoProtocolOpen={setInternalPhotoProtocolOpen}
				isEffectiveOrthoPhotoModalOpen={isEffectiveOrthoPhotoModalOpen}
				setInternalOrthoPhotoModalOpen={setInternalOrthoPhotoModalOpen}
			/>
		);
	},
);

PatientWorkspaceModals.displayName = "PatientWorkspaceModals";
