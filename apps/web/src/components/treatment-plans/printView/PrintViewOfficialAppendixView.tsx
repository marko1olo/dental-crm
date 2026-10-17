import React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";
import { PrintViewOfficialFooter } from "./PrintViewOfficialFooter";
import { PrintViewOfficialHeader } from "./PrintViewOfficialHeader";
import { PrintViewOfficialTable } from "./PrintViewOfficialTable";
import { PrintViewWatermark } from "./PrintViewWatermark";

export interface PrintViewOfficialAppendixViewProps {
	readonly clinicName: string;
	readonly clinicLicense?: string | undefined;
	readonly clinicLegalName: string;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientId?: string | undefined;
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly todayRu: string;
	readonly effectiveWatermark: string;
	readonly stampColor: string;
	readonly showMicroConsumables: boolean;
}

export const PrintViewOfficialAppendixView: React.FC<PrintViewOfficialAppendixViewProps> = ({
	clinicName, clinicLicense, clinicLegalName, clinicInn, clinicOgrn, clinicAddress,
	doctorFullName, doctorSpecialty, patientName, patientBirthDate, patientPhone,
	patientId, selectedTier, getTierLetter, todayRu, effectiveWatermark, stampColor,
	showMicroConsumables,
}) => {
	return (
		<div data-testid="official-appendix-view" style={{ position: "relative" }}>
			<PrintViewWatermark text={effectiveWatermark} rotation={-30} />
			<PrintViewOfficialHeader
				clinicName={clinicName}
				clinicLicense={clinicLicense}
				clinicLegalName={clinicLegalName}
				clinicInn={clinicInn}
				clinicOgrn={clinicOgrn}
				clinicAddress={clinicAddress}
				doctorFullName={doctorFullName}
				doctorSpecialty={doctorSpecialty}
				patientName={patientName}
				patientBirthDate={patientBirthDate}
				patientPhone={patientPhone}
				patientId={patientId}
				selectedTier={selectedTier}
				getTierLetter={getTierLetter}
				todayRu={todayRu}
				effectiveWatermark={effectiveWatermark}
				stampColor={stampColor}
			/>
			<PrintViewOfficialTable
				selectedTier={selectedTier}
				showMicroConsumables={showMicroConsumables}
			/>
			<PrintViewOfficialFooter
				selectedTier={selectedTier}
				doctorFullName={doctorFullName}
				patientName={patientName}
			/>
		</div>
	);
};
