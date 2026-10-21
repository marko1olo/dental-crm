import { useRef } from "react";
import { showToast } from "../../GlobalToast.js";
import type { TreatmentPlanStage } from "../types.js";

interface UseStageDispatcherParams {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly onSendStageToVisit?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onSendStageToInvoice?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export function useStageDispatcher({
	patientId,
	patientName,
	onSendStageToVisit,
	onSendStageToInvoice,
	onPayStage,
}: UseStageDispatcherParams) {
	const inFlightRef = useRef(false);

	const mapServices = (stage: TreatmentPlanStage) =>
		(stage.items || []).map((it) => ({
			code804n: it.code804n,
			name: it.name,
			title: it.name,
			priceRub: it.priceRub || it.unitPriceRub || 0,
			unitPriceRub: it.unitPriceRub || it.priceRub || 0,
			quantity: it.quantity || 1,
			toothNumber: it.toothNumber,
			toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
		}));

	const handlePayStage = (stage: TreatmentPlanStage) => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			const services = mapServices(stage);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-open-stage-payment", {
						detail: {
							stage,
							stageNumber: stage.stageNumber,
							stageTitle: stage.title,
							items: stage.items,
							totalRub: stage.totalRub,
							patientId,
							patientName,
						},
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services,
							items: services,
							stageNumber: stage.stageNumber,
							stageTitle: stage.title,
							patientId,
							patientName,
							target: "invoice",
						},
					}),
				);
			}

			if (onPayStage) onPayStage(stage);
			else onSendStageToInvoice?.(stage);

			showToast(
				`Открыта кассовая оплата этапа ${stage.stageNumber} («${stage.title}») на сумму ${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽`,
				"success",
			);
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 300);
		}
	};

	const handleSendStage = (stage: TreatmentPlanStage, target: "visit" | "invoice") => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			const services = mapServices(stage);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: { services, items: services, stageNumber: stage.stageNumber, stageTitle: stage.title, patientId, patientName, target },
					}),
				);
			}

			if (target === "visit") {
				onSendStageToVisit?.(stage);
				showToast(`Этап ${stage.stageNumber} («${stage.title}») передан в приём врача`, "success");
			} else {
				onSendStageToInvoice?.(stage);
				showToast(`Этап ${stage.stageNumber} («${stage.title}») передан в кассовый счёт`, "success");
			}
		} finally {
			setTimeout(() => { inFlightRef.current = false; }, 300);
		}
	};

	return { handlePayStage, handleSendStage };
}
