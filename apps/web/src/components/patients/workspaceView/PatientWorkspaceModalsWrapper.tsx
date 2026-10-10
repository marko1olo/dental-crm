import React from "react";
import { PatientWorkspaceModals } from "../PatientWorkspaceModals";
import { PatientTreatmentPlanDrawerModal } from "../workspace/PatientTreatmentPlanDrawerModal";

const DicomViewerModal = React.lazy(() =>
	import("../../imaging/DicomViewerModal").then((m) => ({
		default: m.DicomViewerModal,
	})),
);

export interface PatientWorkspaceModalsWrapperProps {
	patientId: string;
	patientName?: string | null | undefined;
	logic: any;
}

export const PatientWorkspaceModalsWrapper: React.FC<PatientWorkspaceModalsWrapperProps> = React.memo(
	({ patientId, patientName, logic }) => {
		return (
			<>
				{logic.isDicomModalOpen && (
					<React.Suspense fallback={null}>
						<DicomViewerModal
							isOpen={logic.isDicomModalOpen}
							onClose={() => {
								logic.setIsDicomModalOpen(false);
								logic.setSelectedScanForDicom(null);
							}}
							imageSrc={logic.selectedScanForDicom?.url}
							patientName={patientName || undefined}
							toothFdiCode={logic.selectedScanForDicom?.tooth ? String(logic.selectedScanForDicom.tooth) : "16"}
						/>
					</React.Suspense>
				)}

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

				{logic.isPlanModalOpen && (
					<PatientTreatmentPlanDrawerModal
						isOpen={logic.isPlanModalOpen}
						onClose={() => {
							logic.setIsPlanModalOpen(false);
							logic.setSelectedPlanIdForModal(null);
						}}
						patientId={patientId}
						activePatient={logic.currentPatient}
						organizationId={(logic.dashboard as any)?.organizationId}
						initialPlanId={logic.selectedPlanIdForModal}
					/>
				)}
			</>
		);
	},
);
PatientWorkspaceModalsWrapper.displayName = "PatientWorkspaceModalsWrapper";
