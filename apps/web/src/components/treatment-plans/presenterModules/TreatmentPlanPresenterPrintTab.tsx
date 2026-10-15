import React from "react";
import { TreatmentPlanPresenterPrintView } from "../TreatmentPlanPresenterPrintView";
import {
	getTierLetter,
	type useTreatmentPlanPresenterState,
} from "./useTreatmentPlanPresenterState";
import type { TreatmentPlanPresenterModalProps } from "./treatmentPlanPresenterTypes";

export interface TreatmentPlanPresenterPrintTabProps {
	readonly s: ReturnType<typeof useTreatmentPlanPresenterState>;
	readonly props: TreatmentPlanPresenterModalProps;
}

export const TreatmentPlanPresenterPrintTab: React.FC<TreatmentPlanPresenterPrintTabProps> = ({
	s,
	props,
}) => {
	const {
		patientName = "",
		patientId = "",
		patientPhone = "",
		patientBirthDate,
		doctorFullName = "",
		doctorSpecialty = "",
		clinicName = "DENTE Стоматология",
		clinicLegalName = "",
		clinicInn = "",
		clinicOgrn = "",
		clinicAddress = "",
		clinicPhone = "",
		clinicLicense = "",
		watermarkText,
	} = props;

	return (
		<TreatmentPlanPresenterPrintView
			printDocFormat={s.printDocFormat}
			setPrintDocFormat={s.setPrintDocFormat}
			showMicroConsumables={s.showMicroConsumables}
			setShowMicroConsumables={s.setShowMicroConsumables}
			selectedTier={s.selectedTier}
			patientName={patientName}
			patientBirthDate={patientBirthDate}
			patientPhone={patientPhone}
			doctorFullName={doctorFullName}
			doctorSpecialty={doctorSpecialty}
			clinicName={clinicName}
			clinicLegalName={clinicLegalName}
			clinicInn={clinicInn}
			clinicOgrn={clinicOgrn}
			clinicAddress={clinicAddress}
			clinicPhone={clinicPhone}
			clinicLicense={clinicLicense}
			displayContractNumber={s.displayContractNumber}
			todayRu={s.todayRu}
			watermarkText={watermarkText}
			getTierLetter={getTierLetter}
			patientId={patientId}
			planAgeDays={s.planAgeDays}
		/>
	);
};
