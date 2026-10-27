import React from "react";
import { useRecentPatients } from "./useRecentPatients";
import { RecentPatientsDropdownView } from "./RecentPatientsDropdownView";
import { RecentPatientsGridView } from "./RecentPatientsGridView";

export interface RecentPatientHistoryWidgetProps {
	readonly compactDropdown?: boolean | undefined;
}

export const RecentPatientHistoryWidget: React.FC<RecentPatientHistoryWidgetProps> = ({
	compactDropdown = false,
}) => {
	const {
		patients,
		loading,
		failed,
		isOpen,
		setIsOpen,
		activeLastPatient,
		handleOpenPatient,
	} = useRecentPatients();

	if (compactDropdown) {
		return (
			<RecentPatientsDropdownView
				isOpen={isOpen}
				onToggleOpen={setIsOpen}
				patients={patients}
				activeLastPatient={activeLastPatient}
				loading={loading}
				failed={failed}
				onOpenPatient={handleOpenPatient}
			/>
		);
	}

	return (
		<RecentPatientsGridView
			patients={patients}
			activeLastPatient={activeLastPatient}
			loading={loading}
			failed={failed}
			onOpenPatient={handleOpenPatient}
		/>
	);
};
