import React from "react";
import type { DentalLabOrderData } from "./DentalLabOrderModal";
import {
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
	type Orthopedic6StageKey,
	checkFittingAppointmentCollision,
} from "./dentalLabOrderEngine";
import { TimelineHeader } from "./timelineModules/TimelineHeader";
import { TimelineStepItem, getStagePartyRu } from "./timelineModules/TimelineStepItem";
import { TimelineTrialDatesCards } from "./timelineModules/TimelineTrialDatesCards";

export { getStagePartyRu };

export interface DentalLabStageTrackingTimelineProps {
	readonly order: DentalLabOrderData;
	readonly onAdvanceStage?: (orderId: string, newStage: Orthopedic6StageKey, notes?: string) => Promise<void> | void;
	readonly onUpdateTrialDates?: (orderId: string, dates: { frameworkTrialDate?: string; ceramicTrialDate?: string; dueDate?: string }) => Promise<void> | void;
	readonly compact?: boolean;
}

export function DentalLabStageTrackingTimeline({
	order,
	onAdvanceStage,
	compact = false,
}: DentalLabStageTrackingTimelineProps) {
	const current6Stage = mapTo6StageOrthopedicLifecycle(order.currentStage || order.status || "draft");
	const currentStepIndex = CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.findIndex((s) => s.id === current6Stage);
	const collision = checkFittingAppointmentCollision(order.dueDate ?? undefined, order.scheduledVisitDate ?? undefined);

	const handleStepClick = async (targetStage: Orthopedic6StageKey) => {
		if (!order.id || !onAdvanceStage) return;
		await onAdvanceStage(order.id, targetStage);
	};

	return (
		<div
			className="w-full bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3.5 shadow-2xs text-xs space-y-3"
			data-testid="dental-lab-stage-tracking-timeline"
		>
			<TimelineHeader order={order} collision={collision} />

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
				{CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.map((step, idx) => (
					<TimelineStepItem
						key={step.id}
						step={step}
						idx={idx}
						isPassed={currentStepIndex >= idx}
						isCurrent={currentStepIndex === idx}
						onClick={() => handleStepClick(step.id as Orthopedic6StageKey)}
					/>
				))}
			</div>

			{!compact && <TimelineTrialDatesCards order={order} />}
		</div>
	);
}
