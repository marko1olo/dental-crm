import React, { Suspense } from "react";
import type { DmsGuaranteeLetter } from "../insurance/DmsGuaranteeLetterModal";

const DmsGuaranteeLetterModal = React.lazy(() =>
	import("../insurance/DmsGuaranteeLetterModal").then((m) => ({
		default: m.DmsGuaranteeLetterModal,
	})),
);

const DmsRegistryExportModal = React.lazy(() =>
	import("../insurance/DmsRegistryExportModal").then((m) => ({
		default: m.DmsRegistryExportModal,
	})),
);

const LoyaltyProgramModal = React.lazy(() =>
	import("../loyalty/program/LoyaltyProgramModal").then((m) => ({
		default: m.LoyaltyProgramModal,
	})),
);

const CbctMprImplantStudioModal = React.lazy(() =>
	import("../radiology/CbctMprImplantStudioModal").then((m) => ({
		default: m.CbctMprImplantStudioModal,
	})),
);

export interface PatientWorkspaceModalsProps {
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly isDmsLetterOpen: boolean;
	readonly setIsDmsLetterOpen: (open: boolean) => void;
	readonly handleSaveDmsLetter: (letter: DmsGuaranteeLetter) => Promise<void>;
	readonly isDmsRegistryOpen: boolean;
	readonly setIsDmsRegistryOpen: (open: boolean) => void;
	readonly isLoyaltyModalOpen: boolean;
	readonly setIsLoyaltyModalOpen: (open: boolean) => void;
	readonly isCbctModalOpen: boolean;
	readonly setIsCbctModalOpen: (open: boolean) => void;
}

export const PatientWorkspaceModals: React.FC<PatientWorkspaceModalsProps> = React.memo(
	function PatientWorkspaceModals({
		patientId,
		patientName,
		isDmsLetterOpen,
		setIsDmsLetterOpen,
		handleSaveDmsLetter,
		isDmsRegistryOpen,
		setIsDmsRegistryOpen,
		isLoyaltyModalOpen,
		setIsLoyaltyModalOpen,
		isCbctModalOpen,
		setIsCbctModalOpen,
	}) {
		return (
			<>
				{/* 3D CBCT / CT Studio Modal */}
				{isCbctModalOpen && (
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
							onClose={() => setIsCbctModalOpen(false)}
							patientName={patientName || undefined}
						/>
					</Suspense>
				)}

				{/* DMS Guarantee Letter Modal */}
				{isDmsLetterOpen && (
					<Suspense fallback={null}>
						<DmsGuaranteeLetterModal
							isOpen={isDmsLetterOpen}
							onClose={() => setIsDmsLetterOpen(false)}
							patient={{
								id: patientId,
								fullName: patientName || "",
							}}
							onSave={handleSaveDmsLetter}
						/>
					</Suspense>
				)}

				{/* DMS Registry Export Modal */}
				{isDmsRegistryOpen && (
					<Suspense fallback={null}>
						<DmsRegistryExportModal
							isOpen={isDmsRegistryOpen}
							onClose={() => setIsDmsRegistryOpen(false)}
						/>
					</Suspense>
				)}

				{/* Loyalty & Gift Certificate Modal */}
				{isLoyaltyModalOpen && (
					<Suspense fallback={null}>
						<LoyaltyProgramModal
							isOpen={isLoyaltyModalOpen}
							onClose={() => setIsLoyaltyModalOpen(false)}
							patientId={patientId}
							patientName={patientName || undefined}
							medicalCardNumber={
								patientId
									? `043/у-${String(patientId || "").slice(0, 8)}`
									: "043/у"
							}
						/>
					</Suspense>
				)}
			</>
		);
	},
);

PatientWorkspaceModals.displayName = "PatientWorkspaceModals";
