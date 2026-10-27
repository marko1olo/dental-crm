import React from "react";
import { createPortal } from "react-dom";

const DicomViewerModal = React.lazy(() =>
	import("../../../imaging/DicomViewerModal").then((m) => ({
		default: m.DicomViewerModal,
	})),
);

const DirectRvgCaptureModal = React.lazy(() =>
	import("../../../radiology/DirectRvgCaptureModal").then((m) => ({
		default: m.DirectRvgCaptureModal,
	})),
);

const RadiologyConsultationSplit = React.lazy(() =>
	import("../../../radiology/RadiologyConsultationSplit").then((m) => ({
		default: m.RadiologyConsultationSplit,
	})),
);

const PrescriptionModal = React.lazy(() =>
	import("../../../prescriptions/PrescriptionModal").then((m) => ({
		default: m.PrescriptionModal,
	})),
);

export interface PatientWorkspaceClinicalModalsProps {
	patientName?: string | null | undefined;
	logic: any;
}

export const PatientWorkspaceClinicalModals: React.FC<PatientWorkspaceClinicalModalsProps> = ({
	patientName,
	logic,
}) => {
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

			{logic.isPrescriptionModalOpen && (
				<React.Suspense fallback={null}>
					<PrescriptionModal
						isOpen={logic.isPrescriptionModalOpen}
						onClose={() => logic.setIsPrescriptionModalOpen(false)}
						patient={logic.currentPatient}
						patientName={patientName || logic.currentPatient?.fullName}
						allergies={logic.currentPatient?.allergies}
						doctorName={logic.dashboard?.activeDoctor?.fullName || undefined}
						clinicName={
							logic.dashboard?.clinicSettings?.profile?.brandName ||
							logic.dashboard?.organization?.name ||
							"ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
						}
						clinicAddress={logic.dashboard?.clinicSettings?.profile?.address || undefined}
						clinicPhone={logic.dashboard?.clinicSettings?.profile?.phone || undefined}
					/>
				</React.Suspense>
			)}
		</>
	);
};
