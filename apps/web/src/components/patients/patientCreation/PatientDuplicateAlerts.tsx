import React from "react";
import type { PotentialDuplicateItem } from "../../schedule/patientSearchEngine";
import { PatientDuplicateConflictAlert } from "./PatientDuplicateConflictAlert";
import { PatientPotentialDuplicatesList } from "./PatientPotentialDuplicatesList";

export interface PatientDuplicateAlertsProps {
	readonly duplicateConflict?: {
		message: string;
		existingPatientId?: string;
		isNameOnlyDuplicate?: boolean;
	} | null | undefined;
	readonly onCreateAsNewDuplicate?: (() => void) | undefined;
	readonly potentialDuplicates: readonly PotentialDuplicateItem[];
	readonly onSelectExistingPatient: (id: string) => void;
}

export function PatientDuplicateAlerts({
	duplicateConflict,
	onCreateAsNewDuplicate,
	potentialDuplicates,
	onSelectExistingPatient,
}: PatientDuplicateAlertsProps) {
	return (
		<>
			<PatientDuplicateConflictAlert
				duplicateConflict={duplicateConflict}
				onCreateAsNewDuplicate={onCreateAsNewDuplicate}
				onSelectExistingPatient={onSelectExistingPatient}
			/>

			<PatientPotentialDuplicatesList
				potentialDuplicates={potentialDuplicates}
				onSelectExistingPatient={onSelectExistingPatient}
			/>
		</>
	);
}
