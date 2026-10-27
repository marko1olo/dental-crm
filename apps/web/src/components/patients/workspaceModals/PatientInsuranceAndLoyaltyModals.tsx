import React, { Suspense } from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

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
const FamilyWalletModal = React.lazy(() =>
	import("../family/FamilyWalletModal").then((m) => ({
		default: m.FamilyWalletModal,
	})),
);

export interface PatientInsuranceAndLoyaltyModalsProps {
	effectiveActiveModal: string | null;
	patientId: string;
	patientName?: string | null | undefined;
	isDmsLetterOpen?: boolean;
	setIsDmsLetterOpen: (v: boolean) => void;
	handleSaveDmsLetter?: (letter: any) => Promise<void> | void;
	isDmsRegistryOpen?: boolean;
	setIsDmsRegistryOpen: (v: boolean) => void;
	isLoyaltyModalOpen?: boolean;
	setIsLoyaltyModalOpen: (v: boolean) => void;
	isFamilyOpen: boolean;
	closeFamilyModal: () => void;
}

export const PatientInsuranceAndLoyaltyModals: React.FC<PatientInsuranceAndLoyaltyModalsProps> = ({
	effectiveActiveModal,
	patientId,
	patientName,
	isDmsLetterOpen,
	setIsDmsLetterOpen,
	handleSaveDmsLetter,
	isDmsRegistryOpen,
	setIsDmsRegistryOpen,
	isLoyaltyModalOpen,
	setIsLoyaltyModalOpen,
	isFamilyOpen,
	closeFamilyModal,
}) => {
	return (
		<>
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
						medicalCardNumber={patientId ? `№ ${String(patientId || "").slice(0, 8)}` : "—"}
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
