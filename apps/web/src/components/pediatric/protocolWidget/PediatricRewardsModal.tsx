import React from "react";
import { PediatricBraveryDiplomaModal } from "../PediatricBraveryDiplomaModal";

export interface PediatricRewardsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
}

export const PediatricRewardsModal: React.FC<PediatricRewardsModalProps> = ({
	isOpen,
	onClose,
	patientName = "Юный пациент",
	patientAgeYears = 6,
	doctorName = "Детский врач-стоматолог",
	clinicName = "Детское отделение DENTE",
}) => {
	if (!isOpen) return null;

	return (
		<PediatricBraveryDiplomaModal
			isOpen={isOpen}
			onClose={onClose}
			patientName={patientName}
			patientAgeYears={patientAgeYears}
			doctorName={doctorName}
			clinicName={clinicName}
		/>
	);
};
