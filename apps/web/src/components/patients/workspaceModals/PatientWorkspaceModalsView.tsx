import React, { Suspense } from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { PatientDuplicateMergeModal } from "./duplicateMerge/PatientDuplicateMergeModal";
import type { PatientWorkspaceModalsProps } from "./types";

const DmsGuaranteeLetterModal = React.lazy(() =>
	import("../../insurance/DmsGuaranteeLetterModal").then((m) => ({
		default: m.DmsGuaranteeLetterModal,
	})),
);
const DmsRegistryExportModal = React.lazy(() =>
	import("../../insurance/DmsRegistryExportModal").then((m) => ({
		default: m.DmsRegistryExportModal,
	})),
);
const LoyaltyProgramModal = React.lazy(() =>
	import("../../loyalty/program/LoyaltyProgramModal").then((m) => ({
		default: m.LoyaltyProgramModal,
	})),
);
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
const FamilyWalletModal = React.lazy(() =>
	import("../family/FamilyWalletModal").then((m) => ({
		default: m.FamilyWalletModal,
	})),
);

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

export const PatientWorkspaceModalsView: React.FC<
	PatientWorkspaceModalsViewProps
> = ({
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
							useUiSurfaceStore
								.getState()
								.closePrimaryModal("cbct_implant_studio");
						}}
						patientName={patientName || undefined}
					/>
				</Suspense>
			)}
			{effectiveActiveModal === "dms_letter" && isDmsLetterOpen && (
				<Suspense fallback={null}>
					<DmsGuaranteeLetterModal
						isOpen={isDmsLetterOpen}
						onClose={() => {
							setIsDmsLetterOpen(false);
							useUiSurfaceStore.getState().closePrimaryModal("dms_letter");
						}}
						patient={{ id: patientId, fullName: patientName || "" }}
						onSave={handleSaveDmsLetter}
					/>
				</Suspense>
			)}
			{effectiveActiveModal === "dms_registry" && isDmsRegistryOpen && (
				<Suspense fallback={null}>
					<DmsRegistryExportModal
						isOpen={isDmsRegistryOpen}
						onClose={() => {
							setIsDmsRegistryOpen(false);
							useUiSurfaceStore.getState().closePrimaryModal("dms_registry");
						}}
						patientId={patientId}
						patientName={patientName || undefined}
					/>
				</Suspense>
			)}
			{effectiveActiveModal === "loyalty" && isLoyaltyModalOpen && (
				<Suspense fallback={null}>
					<LoyaltyProgramModal
						isOpen={isLoyaltyModalOpen}
						onClose={() => {
							setIsLoyaltyModalOpen(false);
							useUiSurfaceStore.getState().closePrimaryModal("loyalty");
						}}
						patientId={patientId}
						patientName={patientName || undefined}
						medicalCardNumber={
							patientId ? `№ ${String(patientId || "").slice(0, 8)}` : "—"
						}
					/>
				</Suspense>
			)}
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
			{effectiveActiveModal === "photo_protocol" &&
				isEffectivePhotoProtocolOpen && (
					<Suspense fallback={null}>
						<ClinicalPhotoProtocolModal
							isOpen={isEffectivePhotoProtocolOpen}
							onClose={() => {
								setInternalPhotoProtocolOpen(false);
								setIsPhotoProtocolOpen?.(false);
								useUiSurfaceStore
									.getState()
									.closePrimaryModal("photo_protocol");
							}}
							patientId={patientId}
							patientName={patientName || undefined}
							doctorName={doctorName}
							clinicName={clinicName}
						/>
					</Suspense>
				)}
			{effectiveActiveModal === "ortho_photo" &&
				isEffectiveOrthoPhotoModalOpen && (
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
			{(effectiveActiveModal === "family_wallet" || isFamilyOpen) && (
				<Suspense fallback={null}>
					<FamilyWalletModal
						isOpen={isFamilyOpen}
						onClose={() => {
							closeFamilyModal();
							useUiSurfaceStore.getState().closePrimaryModal("family_wallet");
						}}
						patientId={patientId}
						patientName={patientName}
					/>
				</Suspense>
			)}
		</>
	);
};
