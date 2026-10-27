import React, { Suspense } from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

const CbctMprImplantStudioModal = React.lazy(() =>
	import("../../radiology/CbctMprImplantStudioModal").then((m) => ({
		default: m.CbctMprImplantStudioModal,
	})),
);
const ClinicalPhotoProtocolModal = React.lazy(() =>
	import("../../photography/ClinicalPhotoProtocolModal").then((m) => ({
		default: m.ClinicalPhotoProtocolModal,
	})),
);
const OrthodonticPhotoProtocolModal = React.lazy(() =>
	import("../../diagnostics/OrthodonticPhotoProtocolModal").then((m) => ({
		default: m.OrthodonticPhotoProtocolModal,
	})),
);

export interface PatientClinicalPhotoModalsProps {
	effectiveActiveModal: string | null;
	isCbctModalOpen?: boolean;
	setIsCbctModalOpen: (v: boolean) => void;
	patientId: string;
	patientName?: string | null | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	isEffectivePhotoProtocolOpen: boolean;
	setInternalPhotoProtocolOpen: (v: boolean) => void;
	setIsPhotoProtocolOpen?: ((v: boolean) => void) | undefined;
	isEffectiveOrthoPhotoModalOpen: boolean;
	setInternalOrthoPhotoModalOpen: (v: boolean) => void;
	setIsOrthoPhotoModalOpen?: ((v: boolean) => void) | undefined;
}

export const PatientClinicalPhotoModals: React.FC<PatientClinicalPhotoModalsProps> = ({
	effectiveActiveModal,
	isCbctModalOpen,
	setIsCbctModalOpen,
	patientId,
	patientName,
	doctorName,
	clinicName,
	isEffectivePhotoProtocolOpen,
	setInternalPhotoProtocolOpen,
	setIsPhotoProtocolOpen,
	isEffectiveOrthoPhotoModalOpen,
	setInternalOrthoPhotoModalOpen,
	setIsOrthoPhotoModalOpen,
}) => {
	return (
		<>
			{effectiveActiveModal === "cbct_implant_studio" && isCbctModalOpen && (
				<Suspense
					fallback={
						<div
							className="cbct-studio-modal fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-cyan-400 text-xs font-mono"
							data-testid="patient-workspace-cbct-loading"
						>
							Загрузка 3D КТ...
						</div>
					}
				>
					<CbctMprImplantStudioModal
						isOpen={isCbctModalOpen}
						onClose={() => {
							setIsCbctModalOpen(false);
							useUiSurfaceStore.getState().closePrimaryModal("cbct_implant_studio");
						}}
						patientName={patientName || undefined}
					/>
				</Suspense>
			)}
			{effectiveActiveModal === "photo_protocol" && isEffectivePhotoProtocolOpen && (
				<Suspense fallback={null}>
					<ClinicalPhotoProtocolModal
						isOpen={isEffectivePhotoProtocolOpen}
						onClose={() => {
							setInternalPhotoProtocolOpen(false);
							setIsPhotoProtocolOpen?.(false);
							useUiSurfaceStore.getState().closePrimaryModal("photo_protocol");
						}}
						patientId={patientId}
						patientName={patientName || undefined}
						doctorName={doctorName}
						clinicName={clinicName}
					/>
				</Suspense>
			)}
			{effectiveActiveModal === "ortho_photo" && isEffectiveOrthoPhotoModalOpen && (
				<Suspense fallback={null}>
					<OrthodonticPhotoProtocolModal
						isOpen={isEffectiveOrthoPhotoModalOpen}
						onClose={() => {
							setInternalOrthoPhotoModalOpen(false);
							setIsOrthoPhotoModalOpen?.(false);
							useUiSurfaceStore.getState().closePrimaryModal("ortho_photo");
						}}
						patientId={patientId}
						patientName={patientName || undefined}
						doctorName={doctorName}
						clinicName={clinicName}
					/>
				</Suspense>
			)}
		</>
	);
};
