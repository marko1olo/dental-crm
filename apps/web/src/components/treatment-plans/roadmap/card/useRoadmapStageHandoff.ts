import { useRef } from "react";
import { showToast } from "../../../GlobalToast.js";
import type { RoadmapStageData } from "../types.js";
import { dispatchRoadmapBooking } from "./roadmapBookingHelper.js";

interface UseHandoffParams {
	readonly stage: RoadmapStageData;
	readonly patientId?: string | undefined;
	readonly effectivePatientName: string;
	readonly planId?: string | undefined;
	readonly effectivePlanNumber?: string | undefined;
	readonly onSendStageToVisit?: ((stage: RoadmapStageData) => void) | undefined;
	readonly onSendStageToInvoice?: ((stage: RoadmapStageData) => void) | undefined;
	readonly onBookStage?: ((stage: RoadmapStageData) => void) | undefined;
	readonly onSelectStage?: ((stage: RoadmapStageData) => void) | undefined;
	readonly onBookStageSlot?: ((stageNumber: number, stage: RoadmapStageData) => void) | undefined;
}

export function useRoadmapStageHandoff({
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
}: UseHandoffParams) {
	const inFlightRef = useRef(false);

	const mapServices = () =>
		(stage.procedures || []).map((p) => {
			const procTitle = p.title ?? p.titleRu ?? p.patientFriendlyTitleRu ?? p.medicalTitleRu;
			return {
				code804n: p.code804n,
				name: procTitle,
				title: procTitle,
				priceRub: p.priceRub || 0,
				unitPriceRub: p.priceRub || 0,
				quantity: p.quantity || 1,
				toothNumber: p.toothNumber,
				toothCode: p.toothNumber ? String(p.toothNumber) : undefined,
			};
		});

	const handleSendStageToVisit = () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			const services = mapServices();
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: { services, items: services, stageNumber: stage.stageNumber, stageTitle: stage.titleRu, patientId, patientName: effectivePatientName, target: "visit" },
					}),
				);
			}
			onSendStageToVisit?.(stage);
			showToast(`Этап ${stage.stageNumber} («${stage.titleRu}») передан в приём врача`, "success");
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 300);
		}
	};

	const handleSendStageToInvoice = () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			const services = mapServices();
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: { services, items: services, stageNumber: stage.stageNumber, stageTitle: stage.titleRu, patientId, patientName: effectivePatientName, target: "invoice" },
					}),
				);
			}
			onSendStageToInvoice?.(stage);
			showToast(`Этап ${stage.stageNumber} («${stage.titleRu}») передан в кассовый счёт`, "success");
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 300);
		}
	};

	const handleBookStage = () => {
		dispatchRoadmapBooking({
			stage,
			patientId,
			effectivePatientName,
			planId,
			effectivePlanNumber,
			onBookStage,
			onSelectStage,
			onBookStageSlot,
		});
	};

	return { handleSendStageToVisit, handleSendStageToInvoice, handleBookStage };
}
