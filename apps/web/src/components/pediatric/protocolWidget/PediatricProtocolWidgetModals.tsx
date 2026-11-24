import React from "react";
import type { FranklRating } from "@dental/shared";
import { PediatricParentMemoModal } from "../PediatricParentMemoModal";
import { PediatricBraveryDiplomaModal } from "../PediatricBraveryDiplomaModal";
import type { PediatricProtocolId } from "./types";

interface PediatricProtocolWidgetModalsProps {
	readonly isMemoModalOpen: boolean;
	readonly setIsMemoModalOpen: (open: boolean) => void;
	readonly isDiplomaModalOpen: boolean;
	readonly setIsDiplomaModalOpen: (open: boolean) => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAgeYears: number;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly franklRating: FranklRating;
	readonly setFranklRating: (r: FranklRating) => void;
	readonly activePresetId: PediatricProtocolId;
	readonly currentTooth: number;
}

export const PediatricProtocolWidgetModals: React.FC<PediatricProtocolWidgetModalsProps> = ({
	isMemoModalOpen,
	setIsMemoModalOpen,
	isDiplomaModalOpen,
	setIsDiplomaModalOpen,
	patientId,
	patientName,
	patientPhone,
	patientAgeYears,
	doctorName,
	clinicName,
	franklRating,
	setFranklRating,
	activePresetId,
	currentTooth,
}) => {
	return (
		<>
			{isMemoModalOpen && (
				<PediatricParentMemoModal
					key={patientId || "pediatric-parent-memo"}
					isOpen={isMemoModalOpen}
					onClose={() => setIsMemoModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
					initialFrankl={franklRating}
					initialPulpotomy={activePresetId === "pulpotomy_primary" ? { toothNumber: currentTooth } : undefined}
					initialSilvering={activePresetId === "silvering_deep_fluoridation" ? { teethNumbers: [currentTooth] } : undefined}
					initialFissureSealing={activePresetId === "fissure_sealing" ? { teethNumbers: [currentTooth] } : undefined}
					onApplyFrankl={(rating) => setFranklRating(rating)}
				/>
			)}

			{isDiplomaModalOpen && (
				<PediatricBraveryDiplomaModal
					key={patientId || "pediatric-bravery-diploma"}
					isOpen={isDiplomaModalOpen}
					onClose={() => setIsDiplomaModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
		</>
	);
};
