import React from "react";
import { PatientFinanceTab } from "../tabs/PatientFinanceTab";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";

export interface PatientFinancialSummaryProps {
	readonly patient: PatientGeneralInfo;
	readonly onUpdateBalance: (balance: number) => void;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
}

export const PatientFinancialSummary: React.FC<PatientFinancialSummaryProps> = ({
	patient,
	onUpdateBalance,
	onNavigateToVisit,
	onNewAppointment,
}) => {
	return (
		<PatientFinanceTab
			patient={patient}
			onUpdateBalance={onUpdateBalance}
			onNavigateToVisit={onNavigateToVisit}
			onNewAppointment={onNewAppointment}
		/>
	);
};
