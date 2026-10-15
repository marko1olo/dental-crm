import { useMemo, useState, useEffect } from "react";
import {
	extractAppointmentStageInfo,
	groupTreatmentPlanByStages,
	type PlanStageOption,
} from "./visitPlanStageHandoff";
import {
	dispatchTakeStageToVisit,
	dispatchOpenLabOrderForStage,
} from "./visitPlanStageHandoffEvents";

export interface UseVisitPlanStageHandoffProps {
	readonly loadedTreatmentPlan: any;
	readonly activeAppointment?: any | null | undefined;
	readonly activePatient?: any | null | undefined;
	readonly onTakeStage?: ((stage: { title: string; stageNumber: number; items: any[] }, items: any[]) => void) | undefined;
	readonly onOpenLabOrder?: ((stage: { title: string; stageNumber: number; items: any[] }, items: any[]) => void) | undefined;
}

export function useVisitPlanStageHandoff({
	loadedTreatmentPlan,
	activeAppointment,
	activePatient,
	onTakeStage,
	onOpenLabOrder,
}: UseVisitPlanStageHandoffProps) {
	const appointmentStageTarget = useMemo(() => {
		return extractAppointmentStageInfo(activeAppointment);
	}, [activeAppointment]);

	const { stages, allPlanItems, hasMultipleStages, totalPlanPriceRub } = useMemo(() => {
		return groupTreatmentPlanByStages(loadedTreatmentPlan, appointmentStageTarget);
	}, [loadedTreatmentPlan, appointmentStageTarget]);

	const [selectedStageKey, setSelectedStageKey] = useState<number | "all">(() => {
		if (appointmentStageTarget.stageNumber && stages.some((s) => s.stageNumber === appointmentStageTarget.stageNumber)) {
			return appointmentStageTarget.stageNumber;
		}
		const firstStage = stages[0];
		return firstStage ? firstStage.stageNumber : "all";
	});

	useEffect(() => {
		const firstStage = stages[0];
		if (appointmentStageTarget.stageNumber && stages.some((s) => s.stageNumber === appointmentStageTarget.stageNumber)) {
			setSelectedStageKey(appointmentStageTarget.stageNumber);
		} else if (firstStage && selectedStageKey !== "all" && !stages.some((s) => s.stageNumber === selectedStageKey)) {
			setSelectedStageKey(firstStage.stageNumber);
		}
	}, [appointmentStageTarget.stageNumber, stages, selectedStageKey]);

	const activeStage = useMemo<PlanStageOption | null>(() => {
		if (selectedStageKey === "all") return null;
		return stages.find((s) => s.stageNumber === selectedStageKey) || null;
	}, [stages, selectedStageKey]);

	const selectedItems = useMemo<any[]>(() => {
		if (selectedStageKey === "all" || !activeStage) return allPlanItems;
		return activeStage.items;
	}, [selectedStageKey, activeStage, allPlanItems]);

	const selectedTotalRub = useMemo<number>(() => {
		if (selectedStageKey === "all" || !activeStage) return totalPlanPriceRub;
		return activeStage.totalPriceRub;
	}, [selectedStageKey, activeStage, totalPlanPriceRub]);

	const displayStageTitle = useMemo<string>(() => {
		if (selectedStageKey === "all") {
			return `Все этапы плана «${loadedTreatmentPlan?.name || "План лечения"}»`;
		}
		if (activeStage) {
			return `Этап ${activeStage.stageNumber}: ${activeStage.title}`;
		}
		return loadedTreatmentPlan?.name || "План лечения";
	}, [selectedStageKey, activeStage, loadedTreatmentPlan?.name]);

	const isTargetedFromAppointment = Boolean(
		appointmentStageTarget.stageNumber &&
		selectedStageKey === appointmentStageTarget.stageNumber,
	);

	const handleExecuteTakeStage = () => {
		const stagePayload = {
			title: displayStageTitle,
			stageNumber: typeof selectedStageKey === "number" ? selectedStageKey : 1,
			items: selectedItems,
		};
		if (typeof onTakeStage === "function") onTakeStage(stagePayload, selectedItems);
		dispatchTakeStageToVisit(stagePayload, selectedItems, activePatient?.id);
	};

	const handleOpenLabOrderForStage = () => {
		const stagePayload = {
			title: displayStageTitle,
			stageNumber: typeof selectedStageKey === "number" ? selectedStageKey : 1,
			items: selectedItems,
		};
		if (typeof onOpenLabOrder === "function") onOpenLabOrder(stagePayload, selectedItems);
		dispatchOpenLabOrderForStage(stagePayload, selectedItems, loadedTreatmentPlan?.id, activePatient);
	};

	return {
		stages,
		allPlanItems,
		hasMultipleStages,
		totalPlanPriceRub,
		selectedStageKey,
		setSelectedStageKey,
		activeStage,
		selectedItems,
		selectedTotalRub,
		displayStageTitle,
		isTargetedFromAppointment,
		appointmentStageTarget,
		handleExecuteTakeStage,
		handleOpenLabOrderForStage,
	};
}
