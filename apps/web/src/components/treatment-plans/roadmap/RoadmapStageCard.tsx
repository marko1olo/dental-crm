import React from "react";
import { RoadmapStageClinicalDetails } from "./card/RoadmapStageClinicalDetails.js";
import { RoadmapStageFooter } from "./card/RoadmapStageFooter.js";
import { RoadmapStageHeader } from "./card/RoadmapStageHeader.js";
import { RoadmapStageProceduresTable } from "./card/RoadmapStageProceduresTable.js";
import { useRoadmapStageHandoff } from "./card/useRoadmapStageHandoff.js";
import type { RoadmapStageData } from "./types.js";

export interface RoadmapStageCardProps {
	stage: RoadmapStageData;
	isExpanded: boolean;
	onToggle: () => void;
	planId?: string | undefined;
	effectivePlanNumber?: string | undefined;
	patientId?: string | undefined;
	effectivePatientName: string;
	todayRu?: string | undefined;
	onBookStage?: ((stage: RoadmapStageData) => void) | undefined;
	onSelectStage?: ((stage: RoadmapStageData) => void) | undefined;
	onBookStageSlot?: ((stageNumber: number, stage: RoadmapStageData) => void) | undefined;
	onSendStageToVisit?: ((stage: RoadmapStageData) => void) | undefined;
	onSendStageToInvoice?: ((stage: RoadmapStageData) => void) | undefined;
}

export const RoadmapStageCard: React.FC<RoadmapStageCardProps> = ({
	stage,
	isExpanded,
	onToggle,
	planId,
	effectivePlanNumber,
	patientId,
	effectivePatientName,
	todayRu,
	onBookStage,
	onSelectStage,
	onBookStageSlot,
	onSendStageToVisit,
	onSendStageToInvoice,
}) => {
	const { handleSendStageToVisit, handleSendStageToInvoice, handleBookStage } = useRoadmapStageHandoff({
		stage,
		patientId,
		effectivePatientName,
		planId,
		effectivePlanNumber,
		onSendStageToVisit,
		onSendStageToInvoice,
		onBookStage,
		onSelectStage,
		onBookStageSlot,
	});

	return (
		<div className={`roadmap-stage-card ${stage.status}`} data-testid={`roadmap-stage-${stage.stageNumber}`}>
			<RoadmapStageHeader stage={stage} isExpanded={isExpanded} onToggle={onToggle} />
			<RoadmapStageClinicalDetails stage={stage} />
			{isExpanded && <RoadmapStageProceduresTable stage={stage} />}
			<RoadmapStageFooter
				stage={stage}
				todayRu={todayRu}
				onSendStageToVisit={handleSendStageToVisit}
				onSendStageToInvoice={handleSendStageToInvoice}
				onBookStage={handleBookStage}
			/>
		</div>
	);
};

export default RoadmapStageCard;
