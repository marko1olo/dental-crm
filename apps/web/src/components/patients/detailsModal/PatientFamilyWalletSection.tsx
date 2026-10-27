import React from "react";
import { PatientFamilyCard } from "../PatientFamilyCard";

export interface PatientFamilyWalletSectionProps {
	readonly patientId: string | null;
	readonly patientName: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: family payload
	readonly familyData: any;
	readonly onFamilyDataChanged: () => void;
}

export const PatientFamilyWalletSection: React.FC<PatientFamilyWalletSectionProps> = ({
	patientId,
	patientName,
	familyData,
	onFamilyDataChanged,
}) => {
	return (
		<div className="flex flex-col gap-4">
			<PatientFamilyCard
				patientId={patientId}
				patientName={patientName}
				familyData={familyData}
				onFamilyDataChanged={onFamilyDataChanged}
			/>
		</div>
	);
};
