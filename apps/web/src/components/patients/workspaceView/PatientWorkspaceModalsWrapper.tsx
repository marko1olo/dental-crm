import React from "react";
import { PatientWorkspaceModals } from "../PatientWorkspaceModals";
import { PatientWorkspaceClinicalModals } from "./modals/PatientWorkspaceClinicalModals";
import { PatientWorkspaceAdministrativeModals } from "./modals/PatientWorkspaceAdministrativeModals";

export interface PatientWorkspaceModalsWrapperProps {
	patientId: string;
	patientName?: string | null | undefined;
	logic: any;
}

export const PatientWorkspaceModalsWrapper: React.FC<PatientWorkspaceModalsWrapperProps> = React.memo(
	({ patientId, patientName, logic }) => {
		return (
			<>
				<PatientWorkspaceClinicalModals patientName={patientName} logic={logic} />

				<PatientWorkspaceModals
					patientId={patientId}
					patientName={patientName || undefined}
					isDmsLetterOpen={logic.isDmsLetterOpen}
					setIsDmsLetterOpen={logic.setIsDmsLetterOpen}
					handleSaveDmsLetter={logic.handleSaveDmsLetter}
					isDmsRegistryOpen={logic.isDmsRegistryOpen}
					setIsDmsRegistryOpen={logic.setIsDmsRegistryOpen}
					isLoyaltyModalOpen={logic.isLoyaltyModalOpen}
					setIsLoyaltyModalOpen={logic.setIsLoyaltyModalOpen}
					isCbctModalOpen={logic.isCbctModalOpen}
					setIsCbctModalOpen={logic.setIsCbctModalOpen}
					isPhotoProtocolOpen={logic.isPhotoProtocolOpen}
					setIsPhotoProtocolOpen={logic.setIsPhotoProtocolOpen}
					isOrthoPhotoModalOpen={logic.isOrthoPhotoModalOpen}
					setIsOrthoPhotoModalOpen={logic.setIsOrthoPhotoModalOpen}
					doctorName={logic.dashboard?.activeDoctor?.fullName || undefined}
					clinicName={logic.dashboard?.clinicSettings?.profile?.brandName || undefined}
				/>

				<PatientWorkspaceAdministrativeModals
					patientId={patientId}
					patientName={patientName}
					logic={logic}
				/>
			</>
		);
	},
);
PatientWorkspaceModalsWrapper.displayName = "PatientWorkspaceModalsWrapper";
