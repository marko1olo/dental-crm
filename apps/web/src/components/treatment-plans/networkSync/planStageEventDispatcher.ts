import type { TreatmentPlanStage } from "../types";

export function dispatchStageStartEvents(
	patientId: string,
	patientName: string,
	stage: TreatmentPlanStage,
): void {
	if (typeof window === "undefined") return;

	window.dispatchEvent(
		new CustomEvent("dente-take-stage-to-visit", {
			detail: {
				patientId,
				patientName,
				stage,
				items: stage.items,
			},
		}),
	);

	window.dispatchEvent(
		new CustomEvent("dente-add-services-to-invoice", {
			detail: {
				patientId,
				patientName,
				stageNumber: stage.stageNumber,
				stageTitle: stage.title,
				services: stage.items,
				items: stage.items,
				target: "invoice",
			},
		}),
	);

	for (const item of stage.items) {
		window.dispatchEvent(
			new CustomEvent("dente-add-billing-item", {
				detail: {
					item: {
						code804n: item.code804n || item.priceId || "A16.07.001",
						title: item.name,
						toothCode: item.toothNumber ? String(item.toothNumber) : undefined,
						quantity: item.quantity || 1,
						unitPriceRub: item.unitPriceRub,
						discountRub: item.discountRub || 0,
					},
				},
			}),
		);
	}

	const estimatedDurationMinutes = stage.items?.length
		? Math.min(120, Math.max(30, stage.items.length * 20))
		: 30;

	const bookingDraft = {
		patientId,
		patientName,
		stageId: stage.stageKind || String(stage.stageNumber),
		stageNumber: stage.stageNumber,
		stageTitle: stage.title,
		items: stage.items,
		services: stage.items,
		procedures: stage.items,
		treatmentPlanId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
		planId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
		doctorId: stage.doctorId ?? null,
		doctorName: stage.doctorName ?? null,
		reason: `Этап ${stage.stageNumber}: ${stage.title}`,
		durationMinutes: estimatedDurationMinutes,
		estimatedDurationMinutes,
	};

	try {
		window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(bookingDraft));
	} catch {
		// quota fallback
	}

	window.dispatchEvent(new CustomEvent("dente-book-stage-appointment", { detail: bookingDraft }));
	window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: bookingDraft }));
	window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: bookingDraft }));
	window.dispatchEvent(
		new CustomEvent("dente-stage-activated", {
			detail: {
				patientId,
				stageNumber: stage.stageNumber,
				stageTitle: stage.title,
			},
		}),
	);
}
