import React from "react";
import { createPortal } from "react-dom";
import { PatientWorkspaceModals } from "../PatientWorkspaceModals";
import { PatientTreatmentPlanDrawerModal } from "../workspace/PatientTreatmentPlanDrawerModal";

const DicomViewerModal = React.lazy(() =>
	import("../../imaging/DicomViewerModal").then((m) => ({
		default: m.DicomViewerModal,
	})),
);

const DirectRvgCaptureModal = React.lazy(() =>
	import("../../radiology/DirectRvgCaptureModal").then((m) => ({
		default: m.DirectRvgCaptureModal,
	})),
);

const RadiologyConsultationSplit = React.lazy(() =>
	import("../../radiology/RadiologyConsultationSplit").then((m) => ({
		default: m.RadiologyConsultationSplit,
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

				{logic.isDirectRvgOpen && (
					<React.Suspense fallback={null}>
						<DirectRvgCaptureModal
							isOpen={logic.isDirectRvgOpen}
							onClose={() => logic.setIsDirectRvgOpen(false)}
							patientName={patientName || undefined}
							patientCardNumber={logic.patientCardNumber || undefined}
							doctorName={logic.dashboard?.activeDoctor?.fullName || undefined}
							onCaptureComplete={() => {
								logic.setIsDirectRvgOpen(false);
							}}
						/>
					</React.Suspense>
				)}

				{logic.isConsultationSplitOpen && (
					<React.Suspense fallback={null}>
						{typeof document !== "undefined" &&
							createPortal(
								<div className="fixed inset-0 z-50 bg-[#020617] flex flex-col" data-testid="patient-consultation-modal-portal">
									<RadiologyConsultationSplit
										patientName={patientName || undefined}
										patientCardNumber={logic.patientCardNumber || undefined}
										activeToothFdi={logic.activeToothFdi || logic.selectedTooth || undefined}
										initialLeftStudy={logic.patientStudies?.[0] || undefined}
										patientStudiesHistory={logic.patientStudies || []}
										onClose={() => logic.setIsConsultationSplitOpen(false)}
									/>
								</div>,
								document.body,
							)}
					</React.Suspense>
				)}
			</>
		);
	},
);
PatientWorkspaceModalsWrapper.displayName = "PatientWorkspaceModalsWrapper";
