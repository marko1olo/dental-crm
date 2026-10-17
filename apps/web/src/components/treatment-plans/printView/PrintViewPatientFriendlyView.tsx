import React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";
import { PrintViewPatientFinance } from "./PrintViewPatientFinance";
import { PrintViewPatientHeader } from "./PrintViewPatientHeader";
import { PrintViewPatientStages } from "./PrintViewPatientStages";
import { PrintViewWatermark } from "./PrintViewWatermark";

export interface PrintViewPatientFriendlyViewProps {
	readonly effectiveWatermark: string;
	readonly stampColor: string;
	readonly clinicName: string;
	readonly clinicLicense?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly displayContractNumber: string;
	readonly todayRu: string;
	readonly patientName: string;
	readonly patientId?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly selectedTier: TreatmentPlanTier;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly planAgeDays?: number | undefined;
}

export const PrintViewPatientFriendlyView: React.FC<PrintViewPatientFriendlyViewProps> = ({
	effectiveWatermark,
	stampColor,
	clinicName,
	clinicLicense,
	clinicPhone,
	displayContractNumber,
	todayRu,
	patientName,
	patientId,
	patientPhone,
	doctorFullName,
	doctorSpecialty,
	selectedTier,
	getTierLetter,
	planAgeDays,
}) => {
	return (
		<div className="patient-friendly-estimate-doc" style={{ position: "relative" }} data-testid="patient-friendly-estimate-view">
			<PrintViewWatermark text={effectiveWatermark} />
			<PrintViewPatientHeader
				clinicName={clinicName}
				clinicLicense={clinicLicense}
				clinicPhone={clinicPhone}
				effectiveWatermark={effectiveWatermark}
				stampColor={stampColor}
				displayContractNumber={displayContractNumber}
				todayRu={todayRu}
				patientName={patientName}
				patientId={patientId}
				patientPhone={patientPhone}
				doctorFullName={doctorFullName}
				doctorSpecialty={doctorSpecialty}
				selectedTier={selectedTier}
				getTierLetter={getTierLetter}
				planAgeDays={planAgeDays}
			/>
			<PrintViewPatientStages stages={selectedTier.stages} />
			<PrintViewPatientFinance
				selectedTier={selectedTier}
				doctorFullName={doctorFullName}
				patientName={patientName}
			/>
		</div>
	);
};
