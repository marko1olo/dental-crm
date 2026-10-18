import { useState } from "react";
import type { TreatmentPlanStage } from "../../types";
import { useScheduleStore } from "../../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { showToast } from "../../../GlobalToast";
import type { QuickBookingSlotInfo } from "../../../schedule/QuickBookingDrawerTypes";

export interface PresenterComparisonHandlerParams {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly planId?: string | undefined;
}

export function usePresenterComparisonHandlers(params: PresenterComparisonHandlerParams) {
	const [activeLabOrderStage, setActiveLabOrderStage] = useState<{
		stage: TreatmentPlanStage;
		toothNumber?: number;
	} | null>(null);

	const handleStageBooking = (stage: TreatmentPlanStage, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const stageSlot: QuickBookingSlotInfo = {
			dateKey: new Date().toISOString().slice(0, 10),
			startTime: "10:00",
			patientId: params.patientId || "pat-1",
			patientName: params.patientName || "Пациент",
			patientPhone: params.patientPhone,
			treatmentPlanId: params.planId || "plan-1",
			stageId: stage.id || `stage_${stage.stageNumber}`,
			stageNumber: stage.stageNumber,
			stageTitle: stage.title,
			estimatedDurationMinutes: stage.estimatedVisits ? stage.estimatedVisits * 45 : 45,
			durationMinutes: 45,
			services: stage.items.map((it) => ({
				code804n: it.code804n,
				name: it.name,
				priceRub: it.priceRub,
				quantity: it.quantity || 1,
			})),
		};

		useScheduleStore.getState().setPendingStageBooking(stageSlot);
		useUiSurfaceStore.getState().openDrawer("quick_booking");
		showToast(`Этап ${stage.stageNumber} передан в расписание для быстрой записи`, "success");
	};

	const handleOpenLabOrder = (stage: TreatmentPlanStage, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const itemWithTooth = stage.items.find((it) => it.toothNumber && it.toothNumber > 0);
		setActiveLabOrderStage({
			stage,
			toothNumber: itemWithTooth?.toothNumber || 16,
		});
	};

	const isStageProsthetic = (stage: TreatmentPlanStage): boolean => {
		return stage.items.some(
			(it) =>
				/коронк|протез|винир|вкладк|циркон|абатмент|ортопед/i.test(it.name) ||
				/A16\.07\.(004|006|035|049)/.test(it.code804n || ""),
		);
	};

	return {
		activeLabOrderStage,
		setActiveLabOrderStage,
		handleStageBooking,
		handleOpenLabOrder,
		isStageProsthetic,
	};
}
