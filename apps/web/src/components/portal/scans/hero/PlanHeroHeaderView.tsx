import React from "react";
import type { PatientTreatmentPlan } from "../../patientCabinet/patientCabinetEngine.js";
import { PlanEmergencyBanner } from "./PlanEmergencyBanner";
import { PlanProgressHero } from "./PlanProgressHero";
import { PlanTaxQuickCard } from "./PlanTaxQuickCard";
import { PlanNextAppointmentBar, type PatientPlanNextAppointment } from "./PlanNextAppointmentBar";

export type { PatientPlanNextAppointment };

export interface PlanHeroHeaderProps {
	readonly plan?: PatientTreatmentPlan | undefined;
	readonly totalCostRub: number;
	readonly paidCostRub: number;
	readonly remainingCostRub: number;
	readonly stagesCount: number;
	readonly completedStagesCount: number;
	readonly progressPercent: number;
	readonly estimatedTaxRefundRub: number;
	readonly onDownloadTax: () => void;
	readonly nextAppointment?: PatientPlanNextAppointment | null | undefined;
	readonly onBookAppointment?: (() => void) | undefined;
	readonly onRescheduleAppointment?: (() => void) | undefined;
	readonly onViewPriceDetails?: (() => void) | undefined;
	readonly emergencyPhone?: string | undefined;
	readonly whatsappUrl: string;
}

export const PlanHeroHeader: React.FC<PlanHeroHeaderProps> = ({
	plan,
	totalCostRub,
	paidCostRub,
	remainingCostRub,
	stagesCount,
	completedStagesCount,
	progressPercent,
	estimatedTaxRefundRub,
	onDownloadTax,
	nextAppointment,
	onBookAppointment,
	onRescheduleAppointment,
	onViewPriceDetails,
	emergencyPhone = "",
	whatsappUrl,
}) => {
	return (
		<>
			<PlanEmergencyBanner
				emergencyPhone={emergencyPhone}
				whatsappUrl={whatsappUrl}
			/>
			<PlanProgressHero
				plan={plan}
				totalCostRub={totalCostRub}
				paidCostRub={paidCostRub}
				remainingCostRub={remainingCostRub}
				stagesCount={stagesCount}
				completedStagesCount={completedStagesCount}
				progressPercent={progressPercent}
				onViewPriceDetails={onViewPriceDetails}
			/>
			<PlanTaxQuickCard
				paidCostRub={paidCostRub}
				estimatedTaxRefundRub={estimatedTaxRefundRub}
				onDownloadTax={onDownloadTax}
			/>
			<PlanNextAppointmentBar
				nextAppointment={nextAppointment}
				onBookAppointment={onBookAppointment}
				onRescheduleAppointment={onRescheduleAppointment}
			/>
		</>
	);
};

export default PlanHeroHeader;
