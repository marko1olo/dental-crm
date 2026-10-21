import type { RoadmapStageData } from "../types.js";

export interface RoadmapBookingParams {
	readonly stage: RoadmapStageData;
	readonly patientId?: string | undefined;
	readonly effectivePatientName: string;
	readonly planId?: string | undefined;
	readonly effectivePlanNumber?: string | undefined;
	readonly onBookStage?: ((stage: RoadmapStageData) => void) | undefined;
	readonly onSelectStage?: ((stage: RoadmapStageData) => void) | undefined;
	readonly onBookStageSlot?: ((stageNumber: number, stage: RoadmapStageData) => void) | undefined;
}

export function dispatchRoadmapBooking(params: RoadmapBookingParams) {
	const {
		stage,
		patientId,
		effectivePatientName,
		planId,
		effectivePlanNumber,
		onBookStage,
		onSelectStage,
		onBookStageSlot,
	} = params;

	onBookStage?.(stage);
	onSelectStage?.(stage);
	onBookStageSlot?.(stage.stageNumber, stage);

	if (typeof window === "undefined") return;

	const estimatedMins =
		stage.procedures && stage.procedures.length > 0
			? Math.min(120, Math.max(30, stage.procedures.length * 20))
			: 30;

	const bookingDetail = {
		treatmentPlanId: planId || (effectivePlanNumber ? `PLAN-${effectivePlanNumber}` : undefined),
		planId: planId || (effectivePlanNumber ? `PLAN-${effectivePlanNumber}` : undefined),
		patientId: patientId || undefined,
		patientName: effectivePatientName,
		patientFullName: effectivePatientName,
		stageId: stage.stageKind || String(stage.stageNumber),
		stageNumber: stage.stageNumber,
		stageTitle: stage.titleRu,
		timelineRu: stage.timelineRu,
		services: stage.procedures,
		items: stage.procedures,
		procedures: stage.procedures,
		reason: `Этап ${stage.stageNumber}: ${stage.titleRu}`,
		estimatedDurationMinutes: estimatedMins,
		durationMinutes: estimatedMins,
	};

	try {
		window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(bookingDetail));
	} catch {}

	window.dispatchEvent(new CustomEvent("dente-book-stage-appointment", { detail: bookingDetail }));
	window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: bookingDetail }));
	window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: bookingDetail }));
	window.location.hash = "#schedule";
}
