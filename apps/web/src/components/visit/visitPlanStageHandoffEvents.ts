export interface StageHandoffPayload {
	readonly title: string;
	readonly stageNumber: number;
	readonly items: any[];
}

export function dispatchTakeStageToVisit(
	stagePayload: StageHandoffPayload,
	items: any[],
	patientId?: string | undefined,
): void {
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-take-stage-to-visit", {
				detail: {
					stage: stagePayload,
					items,
					patientId,
				},
			}),
		);
	}
}

export function dispatchOpenLabOrderForStage(
	stagePayload: StageHandoffPayload,
	items: any[],
	treatmentPlanId?: string | undefined,
	patient?: any | null | undefined,
): void {
	if (typeof window !== "undefined") {
		const detailPayload = {
			treatmentPlanId,
			stageNumber: stagePayload.stageNumber,
			stageTitle: stagePayload.title,
			items,
			patientId: patient?.id,
			patientName: patient?.fullName || patient?.name,
		};
		window.dispatchEvent(
			new CustomEvent("dente-open-lab-order-modal", { detail: detailPayload }),
		);
		window.dispatchEvent(
			new CustomEvent("dente-open-create-lab-order", { detail: detailPayload }),
		);
	}
}
