/**
 * DENTE CRM — Treatment Plan Roadmap Timeline Header & Tax Deduction Banner
 * (Layer 4: Presentation Subcomponent — progress bar, total/paid/remaining metrics, 13% FNS breakdown)
 */

import React from "react";
import type { calculatePlanTaxDeductionBreakdown } from "@dental/shared";
import { RoadmapHeroProgressCard } from "./header/RoadmapHeroProgressCard.js";
import { RoadmapTaxDeductionBanner } from "./header/RoadmapTaxDeductionBanner.js";

export interface RoadmapTimelineHeaderProps {
	planTitle: string;
	planNumber: string;
	curatingDoctorName: string;
	patientFullName: string;
	progressPercent: number;
	grandTotalKopecks: number;
	completedTotalKopecks: number;
	remainingTotalKopecks: number;
	taxBreakdown: ReturnType<typeof calculatePlanTaxDeductionBreakdown>;
	onRequestTaxCertificate?: (() => void) | undefined;
}

export const RoadmapTimelineHeader: React.FC<RoadmapTimelineHeaderProps> = ({
	planTitle,
	planNumber,
	curatingDoctorName,
	patientFullName,
	progressPercent,
	grandTotalKopecks,
	completedTotalKopecks,
	remainingTotalKopecks,
	taxBreakdown,
	onRequestTaxCertificate,
}) => {
	return (
		<>
			<RoadmapHeroProgressCard
				planTitle={planTitle}
				planNumber={planNumber}
				curatingDoctorName={curatingDoctorName}
				patientFullName={patientFullName}
				progressPercent={progressPercent}
				grandTotalKopecks={grandTotalKopecks}
				completedTotalKopecks={completedTotalKopecks}
				remainingTotalKopecks={remainingTotalKopecks}
			/>

			<RoadmapTaxDeductionBanner
				taxBreakdown={taxBreakdown}
				onRequestTaxCertificate={onRequestTaxCertificate}
			/>
		</>
	);
};

export default RoadmapTimelineHeader;
