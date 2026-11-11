import React from "react";
import type { DentalLabOrderData } from "./labMath";
import {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapTo5StageLabStatus,
	type Canonical5LabStatus,
} from "./clinicalStages/canonical5Stages";
import {
	type Orthopedic6StageKey,
	checkFittingAppointmentCollision,
} from "./dentalLabOrderEngine";
import { TimelineHeader } from "./timelineModules/TimelineHeader";
import { TimelineStepItem, getStagePartyRu } from "./timelineModules/TimelineStepItem";
import { TimelineTrialDatesCards } from "./timelineModules/TimelineTrialDatesCards";

export { getStagePartyRu };

export interface DentalLabStageTrackingTimelineProps {
	readonly order: DentalLabOrderData;
	readonly onAdvanceStage?: (orderId: string, newStage: Canonical5LabStatus | Orthopedic6StageKey, notes?: string) => Promise<void> | void;
	readonly onUpdateTrialDates?: (orderId: string, dates: { frameworkTrialDate?: string; ceramicTrialDate?: string; dueDate?: string }) => Promise<void> | void;
	readonly compact?: boolean;
}

export function DentalLabStageTrackingTimeline({
	order,
	onAdvanceStage,
	compact = false,
}: DentalLabStageTrackingTimelineProps) {
	const current5Stage = mapTo5StageLabStatus(order.currentStage || order.status || "sent");
	const currentStepIndex = CANONICAL_5_CLINICAL_LAB_STATUSES.findIndex((s) => s.id === current5Stage);
	const collision = checkFittingAppointmentCollision(order.dueDate ?? undefined, order.scheduledVisitDate ?? undefined);

	const handleStepClick = async (targetStage: Canonical5LabStatus) => {
		if (!order.id || !onAdvanceStage) return;
		await onAdvanceStage(order.id, targetStage);
	};

	return (
		<div
			className="w-full bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3.5 shadow-2xs text-xs space-y-3"
			data-testid="dental-lab-stage-tracking-timeline"
		>
			<TimelineHeader order={order} collision={collision} />

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
				{CANONICAL_5_CLINICAL_LAB_STATUSES.map((step, idx) => (
					<TimelineStepItem
						key={step.id}
						step={step}
						idx={idx}
						isPassed={currentStepIndex >= idx}
						isCurrent={currentStepIndex === idx}
						onClick={() => handleStepClick(step.id)}
					/>
				))}
			</div>

			{!compact && <TimelineTrialDatesCards order={order} />}
		</div>
	);
}
