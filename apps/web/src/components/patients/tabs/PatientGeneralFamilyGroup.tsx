import React from "react";
import { PatientFamilyCard } from "../PatientFamilyCard";
import { PatientRepresentativesSection } from "./generalInfo/PatientRepresentativesSection";
import type { PatientGeneralInfo } from "./generalInfo/types";

interface PatientGeneralFamilyGroupProps {
	patient?: PatientGeneralInfo | null;
	familyData: any;
	familyLoadFailure: boolean;
	loadFamily: () => void;
	disabled?: boolean;
	onUpdatePatient?: (field: keyof PatientGeneralInfo, value: any) => void;
}

export const PatientGeneralFamilyGroup: React.FC<PatientGeneralFamilyGroupProps> = ({
	patient,
	familyData,
	familyLoadFailure,
	loadFamily,
	disabled = false,
	onUpdatePatient,
}) => {
	return (
		<div className="flex flex-col gap-4">
			<PatientFamilyCard
				patientId={patient?.id || null}
				patientName={patient?.fullName || null}
				familyData={familyData}
				loadFailure={familyLoadFailure}
				onRetryLoad={loadFamily}
				onFamilyDataChanged={loadFamily}
			/>
			<PatientRepresentativesSection
				patient={patient}
				onUpdatePatient={onUpdatePatient}
				disabled={disabled}
				mode="full"
			/>
		</div>
	);
};
