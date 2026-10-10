/**
 * DENTE CRM — Treatment Plan Roadmap Master Coordinator & Layer Facade
 * (Layer 5: Master Coordinator — orchestrates subcomponents and re-exports public API)
 */

import React from "react";
import type { TreatmentPlanRoadmapProps } from "./types.js";
import { useTreatmentPlanRoadmap } from "./useTreatmentPlanRoadmap.js";
import { RoadmapTimelineHeader } from "./RoadmapTimelineHeader.js";
import { RoadmapStageCard } from "./RoadmapStageCard.js";
import "../treatmentPlanRoadmap.css";

export const TreatmentPlanRoadmap: React.FC<TreatmentPlanRoadmapProps> = (props) => {
	const {
		className = "",
		planTitle = props.tier?.title || "Комплексный план стоматологического лечения",
		todayRu,
		onBookStage,
		onSelectStage,
		onBookStageSlot,
		onRequestTaxCertificate,
	} = props;

	const {
		effectiveDoctorName,
		effectivePatientName,
		effectivePlanNumber,
		expandedStageNumbers,
		toggleStage,
		roadmapStages,
		grandTotalKopecks,
		completedTotalKopecks,
		remainingTotalKopecks,
		progressPercent,
		taxBreakdown,
	} = useTreatmentPlanRoadmap(props);

	return (
		<div className={`roadmap-container ${className}`} data-testid="treatment-plan-roadmap">
			{/* 1. Hero Progress & Tax Deduction Overview */}
			<RoadmapTimelineHeader
				planTitle={planTitle}
				planNumber={effectivePlanNumber}
				curatingDoctorName={effectiveDoctorName}
				patientFullName={effectivePatientName}
				progressPercent={progressPercent}
				grandTotalKopecks={grandTotalKopecks}
				completedTotalKopecks={completedTotalKopecks}
				remainingTotalKopecks={remainingTotalKopecks}
				taxBreakdown={taxBreakdown}
				onRequestTaxCertificate={onRequestTaxCertificate}
			/>

			{/* 2. 5 Canonical Roadmap Stages List */}
			<div className="roadmap-stages-list" data-testid="roadmap-stages-list">
				{roadmapStages.map((stage) => (
					<RoadmapStageCard
						key={stage.stageNumber}
						stage={stage}
						isExpanded={Boolean(expandedStageNumbers[stage.stageNumber])}
						onToggle={() => toggleStage(stage.stageNumber)}
						planId={props.planId}
						effectivePlanNumber={effectivePlanNumber}
						patientId={props.patientId}
						effectivePatientName={effectivePatientName}
						todayRu={todayRu}
						onBookStage={onBookStage}
						onSelectStage={onSelectStage}
						onBookStageSlot={onBookStageSlot}
					/>
				))}
			</div>
		</div>
	);
};

export default TreatmentPlanRoadmap;

export * from "./types.js";
export * from "./roadmapPriceHelpers.js";
export * from "./useTreatmentPlanRoadmap.js";
export * from "./RoadmapTimelineHeader.js";
export * from "./RoadmapStageCard.js";
